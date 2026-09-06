import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const hasPerm = await hasPermission(session.userId, "grades.view");
    if (!hasPerm) {
      return NextResponse.json({ error: "grades.view permission required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academic_year");
    const term = searchParams.get("term");
    const classId = searchParams.get("class_id");
    const status = searchParams.get("status");
    const studentId = searchParams.get("student_id");

    let query = admin
      .from("report_cards")
      .select("*, profiles!report_cards_student_id_fkey(full_name, email), classes(name, grade_level, stream)")
      .order("generated_at", { ascending: false });

    if (academicYear) query = query.eq("academic_year", academicYear);
    if (term) query = query.eq("term", term);
    if (classId) query = query.eq("class_id", classId);
    if (status) query = query.eq("status", status);
    if (studentId) query = query.eq("student_id", studentId);

    const { data: reports, error } = await query;
    if (error) throw error;

    return NextResponse.json({ reports: reports || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/reports] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
