import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { firstLoginPasswordSchema, changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function createRouteSupabaseClient(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
}

export async function POST(req: NextRequest) {
  // Build response early so Supabase SSR can attach refreshed cookies if needed
  let res = NextResponse.next({ request: { headers: req.headers } });

  try {
    const supabase = createRouteSupabaseClient(req, res);
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
        return NextResponse.json(
          { error: "Invalid input", details: parseResult.error.flatten() },
          { status: 400 }
        );
      }
      newPassword = parseResult.data.new_password;
    } else {
      const parseResult = changePasswordSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parseResult.error.flatten() },
          { status: 400 }
        );
      }
      // Verify current password
      const { error: signInError } = await getSupabaseAdmin().auth.signInWithPassword({
        email: session.user.email!,
        password: parseResult.data.current_password,
      });
      if (signInError) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
      newPassword = parseResult.data.new_password;
    }

    // Update password via admin API
    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(
      session.user.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Mark password as changed
    await getSupabaseAdmin()
      .from("profiles")
      .update({
        password_changed: true,
        temp_password_hash: null,
        last_password_change: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    await logAudit({
      user_id: session.user.id,
      action: "PASSWORD_CHANGED",
      target_type: "profile",
      target_id: session.user.id,
      metadata: { is_first_login: isFirstLogin },
      ip_address: req.headers.get("x-forwarded-for") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    }).catch((e: any) => {
      console.error("[change-password] Audit log failed (non-critical):", e);
    });

    // Return success, forwarding any cookie updates from Supabase SSR
    const successRes = NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
    // Copy over any cookies that Supabase SSR may have refreshed
    res.cookies.getAll().forEach((cookie) => {
      successRes.cookies.set(cookie);
    });
    return successRes;

  } catch (error: any) {
    console.error("[change-password] Unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
