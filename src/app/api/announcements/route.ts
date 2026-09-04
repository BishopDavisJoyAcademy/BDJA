import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    // Determine target audiences based on role
    const audiences: string[] = ["all"];
    if (session.userCategory === "student") audiences.push("students");
    if (session.userCategory === "parent") audiences.push("parents");
    if (session.userCategory === "staff") audiences.push("staff", "teachers");

    let query = admin
      .from("calendar_events")
      .select("*")
      .in("target_audience", audiences)
      .order("start_date", { ascending: false })
      .limit(limit);

    const { data, error } = await query;
    if (error) {
      console.error("[announcements GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
    }

    return NextResponse.json({ announcements: data || [] });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[announcements GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
