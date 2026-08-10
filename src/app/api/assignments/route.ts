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

    let query = admin.from("assignments").select("*");
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query.order("due_date", { ascending: true });
    if (error) return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    return NextResponse.json({ assignments: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[assignments GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "assignments.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { data, error } = await (admin.from("assignments") as any).insert({
      ...body,
      teacher_id: session.userId,
    }).select().single();

    if (error) return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
    return NextResponse.json({ success: true, assignment: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[assignments POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
