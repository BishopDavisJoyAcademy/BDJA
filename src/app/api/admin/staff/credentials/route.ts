import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const body = await req.json();
    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify staff exists
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, user_category, phone")
      .eq("id", id)
      .eq("user_category", "staff")
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Generate new temp password
    const { generateTempPassword, hashPassword } = await import("@/lib/security");
    const newPassword = generateTempPassword();
    const passwordHash = await hashPassword(newPassword);

    // Update auth user password
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (updateAuthError) {
      console.error("[staff credentials POST] Auth update failed:", updateAuthError.message);
      return NextResponse.json({ error: "Failed to update auth password: " + updateAuthError.message }, { status: 500 });
    }

    // Update profile
    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({
        temp_password_hash: passwordHash,
        password_changed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (profileUpdateError) {
      console.error("[staff credentials POST] Profile update failed:", profileUpdateError.message);
    }

    await logAudit({
      user_id: session.userId,
      action: "STAFF_CREDENTIALS_REGENERATED",
      table_name: "staff",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({
      success: true,
      credentials: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        tempPassword: newPassword,
        phone: profile.phone,
      },
      message: "New credentials generated successfully",
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[staff credentials POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
