import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { page_route, action_taken, assistant_suggestion, successful } = body;

    if (!page_route || !action_taken) {
      return NextResponse.json({ error: "page_route and action_taken required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("joy_page_interactions")
      .insert({
        user_id: session.userId,
        page_route,
        action_taken,
        assistant_suggestion,
        successful: successful ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ interaction: data });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/page-interactions] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to log interaction" }, { status: 500 });
  }
}
