import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { executeJoyAction } from "@/lib/joy-actions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .maybeSingle();

    const body = await req.json();
    const { action } = body;

    const result = await executeJoyAction(user.id, profile?.user_category || "student", action);

    // Log action
    await admin.from("joy_actions").insert({
      user_id: user.id,
      action_type: action.type,
      action_data: action,
      success: result.success,
      error_message: result.error || null,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
