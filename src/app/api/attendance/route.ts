import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const date = searchParams.get("date");

    let query = admin.from("attendance").select("*, profiles:student_id(full_name)");
    if (classId) query = query.eq("class_id", classId);
    if (date) query = query.eq("date", date);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
    return NextResponse.json({ attendance: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[attendance GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "attendance.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { data, error } = await admin.from("attendance").insert(body).select().maybeSingle();

    if (error) return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
    return NextResponse.json({ success: true, attendance: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[attendance POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
