import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student_id");
    const term = searchParams.get("term");
    const year = searchParams.get("year");

    let query = admin.from("assessments").select("*, profiles:student_id(full_name), subjects:subject_id(name)");

    if (studentId) query = query.eq("student_id", studentId);
    if (term) query = query.eq("term", term);
    if (year) query = query.eq("academic_year", year);

    if (session.userCategory === "student") {
      query = query.eq("student_id", session.userId);
    } else if (session.userCategory === "parent") {
      const { data: children } = await admin.from("parent_students").select("student_id").eq("parent_id", session.userId);
      const childIds = (children || []).map((c: any) => c.student_id);
      if (childIds.length > 0) {
        query = query.in("student_id", childIds);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
    return NextResponse.json({ grades: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[grades GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "grades.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { data, error } = await (admin.from("assessments") as any).insert(body).select().single();

    if (error) return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
    return NextResponse.json({ success: true, grade: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[grades POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
