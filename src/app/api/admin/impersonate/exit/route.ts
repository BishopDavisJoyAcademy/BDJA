import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logImpersonation } from "@/lib/audit";
import { getClientIp } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserId } = body;

    await logImpersonation(
      user.id, targetUserId, "end",
      getClientIp(req), req.headers.get("user-agent") || undefined
    );

    await admin
      .from("user_sessions")
      .update({ is_active: false })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/admin/impersonate/exit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
