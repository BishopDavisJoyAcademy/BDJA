import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hashPassword, addPasswordToHistory } from "@/lib/security";
import { firstLoginPasswordSchema, firstLoginPinSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, user_category, password_changed")
      .eq("id", session.userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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
      ? (parseResult.data as any).new_pin
      : (parseResult.data as any).new_password;

    const passwordHash = await hashPassword(newCredential);

    const { error: updateError } = await admin
      .from("profiles")
      .update({ temp_password_hash: passwordHash, password_changed: true, updated_at: new Date().toISOString() } as any)
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update password record" }, { status: 500 });
    }

    // Update Supabase Auth password
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(session.userId, { password: newCredential });
    if (authUpdateError) {
      await admin.from("profiles").update({ password_changed: false } as any).eq("id", session.userId);
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
    return NextResponse.json({ error: error.message || "Failed to set password" }, { status: 500 });
  }
}
