import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profileRows } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .limit(1);
    const profile = (profileRows?.[0] ?? null) as { user_category: string } | null;

    if (!profile || profile.user_category !== "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: announcements, error } = await admin
      .from("calendar_events")
      .select("*")
      .in("target_audience", ["all", "parents"])
      .order("start_date", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
    }

    return NextResponse.json({ announcements: announcements || [] });
  } catch (error: unknown) {
    console.error("[api/parent/announcements] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
