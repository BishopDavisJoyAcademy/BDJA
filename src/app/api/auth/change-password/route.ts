import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { firstLoginPasswordSchema, changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return []; }, setAll() {} } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email ?? "";

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
      const { error: signInError } = await getSupabaseAdmin().auth.signInWithPassword({
        email: userEmail,
        password: parseResult.data.current_password,
      });
      if (signInError) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      newPassword = parseResult.data.new_password;
    }

    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(userId, { password: newPassword });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: profileError } = await getSupabaseAdmin()
      .from("profiles")
      .update({ password_changed: true, temp_password_hash: null, last_password_change: new Date().toISOString() })
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json({ error: "Password updated but profile sync failed" }, { status: 500 });
    }

    await logAudit({
      user_id: userId,
      action: "PASSWORD_CHANGED",
      target_type: "profile",
      target_id: userId,
      metadata: { is_first_login: isFirstLogin },
      ip_address: req.headers.get("x-forwarded-for") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Password updated successfully" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
