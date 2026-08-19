import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hashPassword, addPasswordToHistory } from "@/lib/security";
import { firstLoginPasswordSchema, firstLoginPinSchema } from "@/lib/validation";
import { restoreMissingProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log("[first-login] Request received");
    const session = await requireAuth(req);
    console.log("[first-login] Auth success, userId:", session.userId, "passwordChanged:", session.passwordChanged);
    const admin = getSupabaseAdmin();

    let { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, user_category, password_changed")
      .eq("id", session.userId)
      .limit(1);
    let profile = (profileRows?.[0] ?? null) as { id: string; user_category: string; password_changed: boolean } | null;

    if (profileError || !profile) {
      const restored = await restoreMissingProfile(session.userId);
      if (!restored) {
        return NextResponse.json({ error: "Profile not found and could not be restored" }, { status: 404 });
      }
      const { data: restoredRows } = await admin
        .from("profiles")
        .select("id, user_category, password_changed")
        .eq("id", session.userId)
        .limit(1);
      profile = (restoredRows?.[0] ?? null) as { id: string; user_category: string; password_changed: boolean } | null;
      if (!profile) {
        return NextResponse.json({ error: "Profile restored but still not found" }, { status: 500 });
      }
    }

    if (profile.password_changed === true) {
      return NextResponse.json({ error: "Password already set. Use change-password instead." }, { status: 403 });
    }

    const body = await req.json();
    const isStudent = profile.user_category === "student";

    const parseResult = isStudent
      ? firstLoginPinSchema.safeParse(body)
      : firstLoginPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ error: issues }, { status: 400 });
    }

    const newCredential = isStudent
      ? (parseResult.data as { new_pin: string }).new_pin
      : (parseResult.data as { new_password: string }).new_password;

    const passwordHash = await hashPassword(newCredential);

    // Step 1: Update profile first (so we can rollback if auth fails)
    const { error: updateError } = await admin
      .from("profiles")
      .update({ temp_password_hash: passwordHash, password_changed: true, updated_at: new Date().toISOString() })
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update password record" }, { status: 500 });
    }

    // Step 2: Update Supabase Auth password AND metadata
    const { data: authUserData, error: authUpdateError } = await admin.auth.admin.updateUserById(session.userId, {
      password: newCredential,
      user_metadata: { password_changed: true },
    });
    if (authUpdateError) {
      // Rollback: revert profile so user can try again
      await admin.from("profiles").update({ password_changed: false }).eq("id", session.userId);
      return NextResponse.json({ error: "Failed to update auth password" }, { status: 500 });
    }

    if (!isStudent) {
      await addPasswordToHistory(session.userId, passwordHash);
    }

    return NextResponse.json({
      success: true,
      message: isStudent ? "PIN set successfully" : "Password set successfully",
      user_category: profile.user_category,
    });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[first-login] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
