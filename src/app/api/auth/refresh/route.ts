import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json({ error: "Refresh token required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (error: any) {
    console.error("[refresh] Error:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
