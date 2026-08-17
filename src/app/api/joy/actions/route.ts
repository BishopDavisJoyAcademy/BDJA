import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { executeJoyAction } from "@/lib/joy-actions";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { actionType, actionPayload } = body;

    if (!actionType || !actionPayload) {
      return NextResponse.json({ error: "actionType and actionPayload required" }, { status: 400 });
    }

    const result = await executeJoyAction(actionType, actionPayload);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/actions] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
