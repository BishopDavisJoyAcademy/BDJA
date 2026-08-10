import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { changePasswordSchema } from "@/lib/validation";
import { hashPassword, verifyPassword, addPasswordToHistory, isPasswordReused } from "@/lib/security";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const identifier = getClientIP(req) + ":password-change";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.passwordChange);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many password changes. Try again later." }, { status: 429 });
    }

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const parseResult = changePasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { current_password, new_password } = parseResult.data;

    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, temp_password_hash, user_category")
      .eq("id", session.userId)
      .limit(1);
    const profile = (profileRows?.[0] ?? null) as { id: string; temp_password_hash: string | null; user_category: string } | null;

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify current password
    const valid = await verifyPassword(current_password, profile.temp_password_hash || "");
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Check reuse
    const reused = await isPasswordReused(session.userId, new_password);
    if (reused) {
      return NextResponse.json({ error: "Cannot reuse a previous password" }, { status: 400 });
    }

    const passwordHash = await hashPassword(new_password);

    const { error: updateError } = await admin
      .from("profiles")
      .update({ temp_password_hash: passwordHash, password_changed: true, updated_at: new Date().toISOString() })
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(session.userId, { password: new_password });
    if (authUpdateError) {
      console.error("[change-password] Auth update failed:", authUpdateError);
    }

    await addPasswordToHistory(session.userId, passwordHash);

    // Sign out all OTHER sessions, keep current
    await admin.auth.admin.signOut(session.userId, "global");

    return NextResponse.json({ success: true, message: "Password updated. Please log in again." });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[change-password] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
