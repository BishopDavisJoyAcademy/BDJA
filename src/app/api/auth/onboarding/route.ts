import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    const { error: updateError } = await admin
      .from("profiles")
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() } as any)
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Onboarding completed" });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[onboarding] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
