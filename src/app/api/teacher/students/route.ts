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
    const classId = searchParams.get("class_id");

    if (!classId) {
      return NextResponse.json({ error: "class_id is required" }, { status: 400 });
    }

    const canManage =
      session.userCategory === "admin" ||
      session.permissions.includes("classes.manage") ||
      session.permissions.includes("timetables.manage") ||
      session.permissions.includes("staff.manage");

    // Verify teacher has access to this class (skip for managers)
    if (!canManage) {
      const { data: classCheck, error: classErr } = await admin
        .from("classes")
        .select("id, class_teacher_id")
        .eq("id", classId)
        .maybeSingle();

      if (classErr) {
        console.error("[teacher/students GET] class check error:", classErr);
        return NextResponse.json({ error: "Failed to verify class access" }, { status: 500 });
      }

      const isClassTeacher = classCheck?.class_teacher_id === session.userId;

      const { data: subjectCheck, error: subjErr } = await admin
        .from("class_subjects")
        .select("id")
        .eq("class_id", classId)
        .eq("teacher_id", session.userId)
        .maybeSingle();

      if (subjErr) {
        console.error("[teacher/students GET] subject check error:", subjErr);
      }

      const isSubjectTeacher = !!subjectCheck;

      if (!isClassTeacher && !isSubjectTeacher) {
        return NextResponse.json({ error: "You do not have access to this class" }, { status: 403 });
      }
    }

    // Get students in this class via the students table (profile_id -> profiles)
    const { data: students, error: studErr } = await admin
      .from("students")
      .select("id, admission_number, profile_id, class_id, status, profiles(id, full_name, email, phone)")
      .eq("class_id", classId)
      .eq("status", "active");

    if (studErr) {
      console.error("[teacher/students GET] students error:", studErr);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    const formatted = (students || []).map((s: { id: string; profile_id: string | null; admission_number: string; class_id: string | null; status: string | null; profiles: { id: string; full_name: string; email: string; phone: string | null; } | null }) => ({
      id: s.id,
      profile_id: s.profile_id,
      full_name: s.profiles?.full_name || "Unknown",
      email: s.profiles?.email || null,
      phone: s.profiles?.phone || null,
      admission_number: s.admission_number,
      status: s.status,
    }));

    return NextResponse.json({ students: formatted });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[teacher/students GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
