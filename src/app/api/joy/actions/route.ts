import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { executeJoyAction } from "@/lib/joy-actions";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { actionType, actionPayload } = body;

    if (!actionType || !actionPayload) {
      return NextResponse.json({ error: "actionType and actionPayload required" }, { status: 400 });
    }

    // Get user profile for permission validation
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", session.userId)
      .single();

    const userCategory = profile?.user_category || "student";

    const result = await executeJoyAction(actionType, actionPayload, session.userId, userCategory);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/actions] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
