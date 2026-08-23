import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[logout] Error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
