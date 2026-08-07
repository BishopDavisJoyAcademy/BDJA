import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { changePasswordSchema } from "@/lib/validation";
import { hashPassword, verifyPassword, addPasswordToHistory } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json();
    const parseResult = changePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { current_password, new_password } = parseResult.data;

    const { data: profile } = await admin
      .from("profiles")
      .select("temp_password_hash")
      .eq("id", user.id)
      .single();

    const valid = await verifyPassword(current_password, profile?.temp_password_hash || "");
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const passwordHash = await hashPassword(new_password);

    const { error: updateError } = await admin
      .from("profiles")
      .update({ temp_password_hash: passwordHash })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    await addPasswordToHistory(user.id, passwordHash);

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (authUpdateError) {
      console.error("[change-password] Auth password update failed:", authUpdateError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/auth/change-password] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
