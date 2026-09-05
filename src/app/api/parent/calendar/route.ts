import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const admin = getSupabaseAdmin();

    let query = admin
      .from("calendar_events")
      .select(`
        *,
        profiles:created_by(full_name)
      `)
      .or(`target_audience.eq.all,target_audience.eq.parents`)
      .order("start_date", { ascending: true });

    if (start) query = query.gte("start_date", start);
    if (end) query = query.lte("start_date", end);

    const { data, error } = await query;

    if (error) {
      console.error("[api/parent/calendar] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/calendar] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
