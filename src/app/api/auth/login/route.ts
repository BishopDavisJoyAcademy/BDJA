import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-client";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { restoreMissingProfile } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Build response FIRST so Supabase can write cookies into it
    let response = NextResponse.json({});

    const supabase = await createRouteHandlerClient(req, response);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "Invalid credentials" }, { status: 401 });
    }

    // Restore missing profile (defensive)
    const restored = await restoreMissingProfile(data.user.id, data.user.email || "");

    // Fetch profile with admin client to bypass any RLS issues
    const admin = getSupabaseAdmin();
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("password_changed, role, user_category, is_active")
      .eq("id", data.user.id)
      .limit(1);

    const profile = profileRows?.[0] ?? null;

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    // CRITICAL FIX: is_active === false means inactive. NULL/undefined/true means active.
    if (profile.is_active === false) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // Rebuild the response body (cookies already written by Supabase via setAll)
    return NextResponse.json({
      success: true,
      mustChangePassword: !profile.password_changed,
      role: profile.role,
      userCategory: profile.user_category,
      restored,
    }, {
      status: 200,
      headers: response.headers,
    });
  } catch (err: unknown) {
    console.error("[login] Error:", getErrorMessage(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
