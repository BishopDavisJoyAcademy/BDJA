import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { DEFAULT_PASSWORD } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password = DEFAULT_PASSWORD, full_name, role, campus_id, phone } = body;

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError || !authUser.user) {
      return NextResponse.json({ error: authError?.message || "Failed to create user" }, { status: 400 });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authUser.user.id,
      email,
      full_name,
      phone: phone || null,
      role,
      campus_id: campus_id || null,
      password_changed: false,
      onboarding_completed: false,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: authUser.user.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
