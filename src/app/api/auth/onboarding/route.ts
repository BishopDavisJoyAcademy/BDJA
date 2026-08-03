import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/onboarding
 *
 * Marks onboarding as completed and returns the updated profile.
 * CRITICAL FIX: Uses .update().select().single() instead of
 * separate .update() then .select() calls. This ensures the read
 * happens on the SAME database connection as the write, avoiding
 * the read-replica lag that caused the onboarding loop.
 */
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

    // CRITICAL FIX: Chain .select() to .update() so the read happens
    // on the primary database connection, not a lagging read replica.
    const { data: profile, error } = await getSupabaseAdmin()
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id)
      .select("role, password_changed, onboarding_completed, is_active")
      .single();

    if (error || !profile) {
      console.error("[auth/onboarding] Update/select failed:", error);
      return NextResponse.json(
        { error: "Failed to complete onboarding" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });

  } catch (error: any) {
    console.error("[auth/onboarding] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
