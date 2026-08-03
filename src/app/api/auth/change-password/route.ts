import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { firstLoginPasswordSchema, changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();

    console.log("[change-password] Cookie names:", allCookies.map((c) => c.name));
    console.log("[change-password] Cookie count:", allCookies.length);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          console.log(`[change-password] getCookie("${name}") => ${cookie ? "found" : "missing"}`);
          return cookie?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    });

    // REAL FIX: @supabase/ssr v0.3.0 silently fails to write auth cookies
    // when the session payload exceeds 4KB (common with custom user_metadata).
    // The server cookie jar is completely empty — getSession() always returns null.
    // We accept the access_token from the client via Authorization header and
    // validate it directly with Supabase Auth using getUser(token).
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let userId: string | null = null;
    let userEmail: string | null = null;

    if (token) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError) {
        console.error("[change-password] getUser error:", userError);
      }
      if (user) {
        userId = user.id;
        userEmail = user.email ?? null;
        console.log("[change-password] Authenticated via Authorization header for user:", userId);
      }
    }

    // Fallback to cookie-based session (for backward compatibility / other callers)
    if (!userId) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("[change-password] getSession error:", sessionError);
      }
      if (!session) {
        console.error("[change-password] No session found. Cookies present:", allCookies.map((c) => c.name));
        return NextResponse.json(
          { error: "Unauthorized", debug: "No active session. Please log in again." },
          { status: 401 }
        );
      }
      userId = session.user.id;
      userEmail = session.user.email ?? null;
      console.log("[change-password] Authenticated via cookie session for user:", userId);
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
      const { error: signInError } = await getSupabaseAdmin().auth.signInWithPassword({
        email: userEmail!,
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

    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("[change-password] Admin update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await getSupabaseAdmin()
      .from("profiles")
      .update({
        password_changed: true,
        temp_password_hash: null,
        last_password_change: new Date().toISOString(),
      })
      .eq("id", userId);

    await logAudit({
      user_id: userId,
      action: "PASSWORD_CHANGED",
      target_type: "profile",
      target_id: userId,
      metadata: { is_first_login: isFirstLogin },
      ip_address: req.headers.get("x-forwarded-for") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    }).catch((e: any) => {
      console.error("[change-password] Audit log failed (non-critical):", e);
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });

  } catch (error: any) {
    console.error("[change-password] Unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
