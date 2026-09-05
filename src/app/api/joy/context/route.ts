import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { buildJoyContext } from "@/lib/joy-context";
import { requireAuth } from "@/lib/session";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const context = await buildJoyContext(session.userId);
    return NextResponse.json({ context });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
