import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-client";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { restoreMissingProfile } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let response = NextResponse.json({});
    const supabase = await createRouteHandlerClient(req, response);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // CRITICAL FIX: Verify account is active before allowing password change
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_active")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (profile.is_active === false) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const body = await req.json();
    const { newPassword, newPin } = body;
    const credential = newPassword || newPin;
    if (!credential || credential.length < (newPin ? 4 : 8)) {
      return NextResponse.json({ error: newPin ? "PIN must be at least 4 digits" : "Password must be at least 8 characters" }, { status: 400 });
    }

    // Update auth password
    const { error: updateError } = await supabase.auth.updateUser({ password: credential });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Use admin client to bypass RLS for profile update
    const { error: profileError } = await admin.from("profiles").update({
      password_changed: true,
      updated_at: new Date().toISOString(),
    }).eq("id", session.user.id);

    if (profileError) {
      console.error("[first-login] Profile update error:", profileError);
      // Non-fatal: auth password is changed, profile might need manual fix
    }

    const restored = await restoreMissingProfile(session.user.id, session.user.email || "");

    return NextResponse.json({ success: true, restored });
  } catch (err: unknown) {
    console.error("[first-login] Error:", getErrorMessage(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
