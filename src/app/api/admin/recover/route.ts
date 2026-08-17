import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { restoreMissingProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "admin.access");

    const body = await req.json();
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json({ error: "userId and email required" }, { status: 400 });
    }

    const restored = await restoreMissingProfile(userId, email);
    return NextResponse.json({ success: restored });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[recover] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
