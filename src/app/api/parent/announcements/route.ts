import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    const { data, error: dbError } = await admin
      .from("announcements")
      .select("*")
      .or("audience.cs.{parents},audience.cs.{all}")
      .order("created_at", { ascending: false })
      .limit(10);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ announcements: data || [] });
  } catch (error: any) {
    console.error("[api/parent/announcements] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
