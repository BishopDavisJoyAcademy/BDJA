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
    requirePermission(session, "students.create");

    const body = await req.json();
    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify student exists
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name, user_category, phone")
      .eq("id", id)
      .eq("user_category", "student")
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get admission number
    const { data: studentRecord } = await admin
      .from("students")
      .select("admission_number")
      .eq("id", id)
      .maybeSingle();

    const admissionNumber = studentRecord?.admission_number || "N/A";

    // Generate new 4-digit PIN for students
    const { generatePIN, hashPassword } = await import("@/lib/security");
    const newPin = generatePIN();
    const passwordHash = await hashPassword(newPin);

    // Update auth user password
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(id, {
      password: newPin,
    });

    if (updateAuthError) {
      console.error("[student credentials POST] Auth update failed:", updateAuthError.message);
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
      console.error("[student credentials POST] Profile update failed:", profileUpdateError.message);
    }

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_CREDENTIALS_REGENERATED",
      table_name: "students",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({
      success: true,
      credentials: {
        id: profile.id,
        fullName: profile.full_name,
        admissionNumber,
        tempPassword: newPin,
        phone: profile.phone,
      },
      message: "New PIN generated successfully",
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[student credentials POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
