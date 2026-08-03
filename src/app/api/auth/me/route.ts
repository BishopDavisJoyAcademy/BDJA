import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 *
 * Returns the current user's profile + auth info.
 * Accepts token via Authorization header (no cookie dependency).
 * Uses admin client to fetch profile, bypassing RLS entirely.
 * This eliminates the "failed to fetch profile" race condition.
 */
export async function GET(req: NextRequest) {
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

    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from("profiles")
      .select("role, full_name, password_changed, onboarding_completed, is_active, campus_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[auth/me] Profile fetch failed:", profileError);
      return NextResponse.json(
        { error: "Profile not found", debug: profileError?.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    });

  } catch (error: any) {
    console.error("[auth/me] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
