import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hashPassword, addPasswordToHistory, isPasswordReused } from "@/lib/security";
import { z } from "zod";

export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Please confirm your password"),
  is_first_login: z.boolean().optional().default(false),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

const firstLoginSchema = z.object({
  new_password: z.string().min(4, "PIN must be at least 4 characters"),
  confirm_password: z.string().min(1, "Please confirm your PIN"),
  is_first_login: z.literal(true),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "PINs do not match",
  path: ["confirm_password"],
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isFirstLogin = body.is_first_login === true;

    // Use appropriate schema
    const parseResult = isFirstLogin
      ? firstLoginSchema.safeParse(body)
      : changePasswordSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ error: issues }, { status: 400 });
    }

    const { new_password } = parseResult.data;

    // Get authenticated user from Bearer token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Fetch profile
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, temp_password_hash, password_changed, user_category")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // For normal changes (not first login), verify current password
    if (!isFirstLogin) {
      const { current_password } = parseResult.data as z.infer<typeof changePasswordSchema>;
      const { verifyPassword } = await import("@/lib/security");
      const valid = await verifyPassword(
        current_password,
        profile?.temp_password_hash || ""
      );
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    // Check password reuse (skip for first login — temp password won't be in history)
    const passwordHash = await hashPassword(new_password);
    if (!isFirstLogin) {
      const reused = await isPasswordReused(user.id, passwordHash);
      if (reused) {
        return NextResponse.json(
          { error: "Cannot reuse a previous password" },
          { status: 400 }
        );
      }
    }

    // Update profile: mark password as changed, store hash
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        temp_password_hash: passwordHash,
        password_changed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[change-password] Profile update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update password record" },
        { status: 500 }
      );
    }

    // Update Supabase Auth password
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (authUpdateError) {
      console.error("[change-password] Auth update error:", authUpdateError);
      // Rollback profile update
      await admin.from("profiles").update({ password_changed: false }).eq("id", user.id);
      return NextResponse.json(
        { error: "Failed to update auth password" },
        { status: 500 }
      );
    }

    // Add to history (skip for first login)
    if (!isFirstLogin) {
      await addPasswordToHistory(user.id, passwordHash);
    }

    // Only sign out globally for normal password changes (security best practice)
    // For first login, keep the session so user can continue to onboarding
    if (!isFirstLogin) {
      await admin.auth.admin.signOut(user.id, "global");
    }

    return NextResponse.json({
      success: true,
      message: isFirstLogin
        ? "PIN set successfully. Welcome to BDJA!"
        : "Password updated successfully",
      is_first_login: isFirstLogin,
    });
  } catch (error: any) {
    console.error("[change-password] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update password" },
      { status: 500 }
    );
  }
}
