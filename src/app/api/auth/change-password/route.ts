import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { firstLoginPasswordSchema, changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/change-password
 * 
 * Validates the user via Authorization header (Bearer token),
 * then updates their password in Supabase Auth and marks
 * password_changed = true in the profiles table.
 * 
 * This bypasses @supabase/ssr v0.3.0's broken cookie handling
 * by accepting the access_token directly from the client.
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Create a server client for token validation
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    });

    // ============================================================
    // AUTHENTICATION: Validate via Authorization header
    // ============================================================
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized", debug: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("[change-password] Token validation failed:", userError);
      return NextResponse.json(
        { error: "Unauthorized", debug: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const userEmail = user.email ?? "";
    console.log("[change-password] Authenticated user:", userId);

    // ============================================================
    // VALIDATION: Parse and validate request body
    // ============================================================
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

      // Verify current password by attempting sign-in
      const { error: signInError } = await getSupabaseAdmin().auth.signInWithPassword({
        email: userEmail,
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

    // ============================================================
    // UPDATE: Change password in Supabase Auth
    // ============================================================
    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("[change-password] Admin update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // ============================================================
    // UPDATE: Mark password as changed in profiles
    // CRITICAL: This must succeed or the user will loop forever
    // ============================================================
    const { error: profileError } = await getSupabaseAdmin()
      .from("profiles")
      .update({
        password_changed: true,
        temp_password_hash: null,
        last_password_change: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error("[change-password] Profile update failed:", profileError);
      return NextResponse.json(
        { error: "Password updated but profile sync failed. Please contact support." },
        { status: 500 }
      );
    }

    console.log("[change-password] Profile updated successfully for user:", userId);

    // Log the audit event (non-critical)
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

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error: any) {
    console.error("[change-password] Unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
