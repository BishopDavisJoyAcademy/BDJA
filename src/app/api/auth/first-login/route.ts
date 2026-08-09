import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hashPassword, addPasswordToHistory } from "@/lib/security";
import { z } from "zod";

export const dynamic = "force-dynamic";

const firstLoginStaffSchema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

const firstLoginStudentSchema = z.object({
  new_pin: z.string().min(4, "PIN must be at least 4 digits").regex(/^\d+$/, "PIN must contain only numbers"),
  confirm_pin: z.string().min(1, "Please confirm your PIN"),
}).refine((data) => data.new_pin === data.confirm_pin, {
  message: "PINs do not match",
  path: ["confirm_pin"],
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    // Validate user session
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Fetch profile
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, user_category, password_changed, temp_password_hash")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Security: only allow first-login if password_changed is false
    if (profile.password_changed === true) {
      return NextResponse.json(
        { error: "Password already set. Use change-password instead." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const isStudent = profile.user_category === "student";

    // Validate based on role
    const parseResult = isStudent
      ? firstLoginStudentSchema.safeParse(body)
      : firstLoginStaffSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ error: issues }, { status: 400 });
    }

    const newCredential = isStudent
      ? (parseResult.data as z.infer<typeof firstLoginStudentSchema>).new_pin
      : (parseResult.data as z.infer<typeof firstLoginStaffSchema>).new_password;

    // Hash and store
    const passwordHash = await hashPassword(newCredential);

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        temp_password_hash: passwordHash,
        password_changed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[first-login] Profile update error:", updateError);
      return NextResponse.json({ error: "Failed to update password record" }, { status: 500 });
    }

    // Update Supabase Auth password
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: newCredential }
    );

    if (authUpdateError) {
      console.error("[first-login] Auth update error:", authUpdateError);
      // Rollback
      await admin.from("profiles").update({ password_changed: false }).eq("id", user.id);
      return NextResponse.json({ error: "Failed to update auth password" }, { status: 500 });
    }

    // Add to history (for staff only — students use PINs)
    if (!isStudent) {
      await addPasswordToHistory(user.id, passwordHash);
    }

    // DO NOT sign out — keep the session alive for onboarding
    return NextResponse.json({
      success: true,
      message: isStudent ? "PIN set successfully" : "Password set successfully",
      user_category: profile.user_category,
    });
  } catch (error: any) {
    console.error("[first-login] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set password" },
      { status: 500 }
    );
  }
}
