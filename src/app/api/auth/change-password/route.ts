import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { firstLoginPasswordSchema, changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const isFirstLogin = body.is_first_login === true;

    let newPassword: string;

    if (isFirstLogin) {
      const parseResult = firstLoginPasswordSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
      }
      newPassword = parseResult.data.new_password;
    } else {
      const parseResult = changePasswordSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
      }
      // Verify current password
      const { error: signInError } = await getSupabaseAdmin().auth.signInWithPassword({
        email: session.user.email!,
        password: parseResult.data.current_password,
      });
      if (signInError) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      newPassword = parseResult.data.new_password;
    }

    // Update password
    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(session.user.id, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Mark password as changed
    await getSupabaseAdmin().from("profiles").update({
      password_changed: true,
      temp_password_hash: null,
      last_password_change: new Date().toISOString(),
    }).eq("id", session.user.id);

    await logAudit({
      user_id: session.user.id,
      action: "PASSWORD_CHANGED",
      target_type: "profile",
      target_id: session.user.id,
      metadata: { is_first_login: isFirstLogin },
      ip_address: req.headers.get("x-forwarded-for") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
