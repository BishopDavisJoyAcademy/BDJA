import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logImpersonation } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, isAuthError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { targetUserId } = body;

    if (targetUserId) {
      await logImpersonation(session.userId, targetUserId, "end", getClientIP(req), req.headers.get("user-agent") || undefined);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[impersonate exit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
