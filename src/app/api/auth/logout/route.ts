import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let response = NextResponse.json({ success: true });
    const supabase = await createRouteHandlerClient(req, response);
    await supabase.auth.signOut({ scope: "global" });

    // Also clear any lingering auth cookies manually
    const cookieNames = [
      "sb-access-token",
      "sb-refresh-token",
      "supabase-auth-token",
    ];
    cookieNames.forEach((name) => {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    });

    return response;
  } catch (error: any) {
    console.error("[logout] Error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
