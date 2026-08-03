import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/onboarding
 *
 * Marks the user's onboarding as completed and returns their role.
 * Accepts token via Authorization header (no cookie dependency).
 * Uses admin client to update profile, bypassing RLS entirely.
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

    // Update profile: mark onboarding completed
    const { error: updateError } = await getSupabaseAdmin()
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    if (updateError) {
      console.error("[auth/onboarding] Update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to complete onboarding" },
        { status: 500 }
      );
    }

    // Fetch updated profile to get role for dashboard redirect
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from("profiles")
      .select("role, password_changed, onboarding_completed, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found after update" },
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
