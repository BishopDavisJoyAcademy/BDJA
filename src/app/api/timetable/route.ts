import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const classId = searchParams.get("class_id");
    const teacherId = searchParams.get("teacher_id");
    const studentId = searchParams.get("student_id");
    const academicYear = searchParams.get("academic_year");
    const term = searchParams.get("term");
    const day = searchParams.get("day_of_week");

    // Build base query from timetable_slots (the canonical admin-built table)
    let query = admin
      .from("timetable_slots")
      .select(`
        id,
        class_id,
        subject_name,
        subject_id,
        teacher_id,
        room,
        day_of_week,
        start_time,
        end_time,
        academic_year,
        term,
        campus_id,
        is_active,
        created_at,
        classes:class_id(id, name, grade_level),
        subjects:subject_id(id, name, code, color),
        profiles:teacher_id(full_name)
      `)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    // Role-based filtering
    if (session.userCategory === "student") {
      // Students see their own class timetable
      if (!studentId) {
        // Try to find the student's class from the students table
        const { data: studentRow } = await admin
          .from("students")
          .select("class_id")
          .eq("id", session.userId)
          .maybeSingle();
        if (studentRow?.class_id) {
          query = query.eq("class_id", studentRow.class_id);
        } else {
          return NextResponse.json({ timetable: [], days: [], terms: [] });
        }
      } else {
        // Verify the studentId matches the session
        if (studentId !== session.userId) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        const { data: studentRow } = await admin
          .from("students")
          .select("class_id")
          .eq("id", studentId)
          .maybeSingle();
        if (studentRow?.class_id) {
          query = query.eq("class_id", studentRow.class_id);
        } else {
          return NextResponse.json({ timetable: [], days: [], terms: [] });
        }
      }
    } else if (session.userCategory === "teacher") {
      if (teacherId) {
        // If teacher requests their own timetable
        if (teacherId !== session.userId) {
          // Check if teacher has manage permission
          const canManage = session.permissions.includes("timetable.manage") || session.userCategory === "admin";
          if (!canManage) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
          }
        }
        query = query.eq("teacher_id", teacherId);
      } else if (classId) {
        // Teachers viewing a class timetable
        query = query.eq("class_id", classId);
      } else {
        // Default: show teacher's own assignments
        query = query.eq("teacher_id", session.userId);
      }
    } else if (session.userCategory === "parent") {
      const childId = searchParams.get("child_id");
      if (!childId) {
        return NextResponse.json({ error: "child_id is required" }, { status: 400 });
      }
      // Verify parent access
      const { data: authCheck } = await admin
        .from("parent_children")
        .select("id")
        .eq("parent_id", session.userId)
        .eq("student_id", childId)
        .limit(1);
      let authorized = (authCheck && authCheck.length > 0);
      if (!authorized) {
        const { data: legacyCheck } = await admin
          .from("parent_students")
          .select("id")
          .eq("parent_id", session.userId)
          .eq("student_id", childId)
          .limit(1);
        authorized = (legacyCheck && legacyCheck.length > 0);
      }
      if (!authorized) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      const { data: studentRow } = await admin
        .from("students")
        .select("class_id")
        .eq("id", childId)
        .maybeSingle();
      if (studentRow?.class_id) {
        query = query.eq("class_id", studentRow.class_id);
      } else {
        return NextResponse.json({ timetable: [], days: [], terms: [] });
      }
    } else if (session.userCategory === "admin") {
      // Admin can filter by anything
      if (classId) query = query.eq("class_id", classId);
      if (teacherId) query = query.eq("teacher_id", teacherId);
    } else {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (academicYear) query = query.eq("academic_year", academicYear);
    if (term) query = query.eq("term", term);
    if (day) query = query.eq("day_of_week", Number(day));

    const { data: slots, error } = await query;

    if (error) {
      console.error("[timetable GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch timetable" }, { status: 500 });
    }

    // Fetch config for days/terms
    const { data: config } = await admin
      .from("timetable_config")
      .select("school_days, terms")
      .maybeSingle();

    return NextResponse.json({
      timetable: slots || [],
      days: config?.school_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      terms: config?.terms || ["Term 1", "Term 2", "Term 3"],
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[timetable GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
