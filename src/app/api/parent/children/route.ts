import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    if (session.userCategory !== "parent") {
      return NextResponse.json({ error: "Forbidden — parents only" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    // Use parent_children (correct table: student_id -> students)
    const { data: rows, error } = await admin
      .from("parent_children")
      .select(`
        student_id,
        relationship,
        students(
          id,
          admission_number,
          grade_level,
          date_of_birth,
          status,
          class_id,
          classes!inner(name, grade_level, stream, class_teacher_id),
          profiles!inner(id, full_name, email, phone, avatar_url)
        )
      `)
      .eq("parent_id", session.userId);

    if (error) {
      console.error("[api/parent/children] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
    }

    // Also try parent_students as fallback for legacy data
    let fallbackRows: Array<Record<string, unknown>> = [];
    if (!rows || rows.length === 0) {
      const { data: legacyRows } = await admin
        .from("parent_students")
        .select(`
          student_id,
          relationship,
          is_primary,
          profiles!inner(id, full_name, email, phone, avatar_url)
        `)
        .eq("parent_id", session.userId);

      if (legacyRows && legacyRows.length > 0) {
        // For legacy, we need to find the student record by profile_id
        const profileIds = legacyRows.map((r: Record<string, unknown>) => r.student_id);
        const { data: studentRecords } = await admin
          .from("students")
          .select(`id, admission_number, grade_level, class_id, classes(name, grade_level, stream, class_teacher_id), profile_id`)
          .in("profile_id", profileIds as string[]);

        const studentMap = new Map();
        (studentRecords || []).forEach((s: Record<string, unknown>) => {
          studentMap.set(s.profile_id, s);
        });

        fallbackRows = legacyRows.map((r: Record<string, unknown>) => {
          const student = studentMap.get(r.student_id as string);
          return {
            student_id: (student as Record<string, unknown>)?.id || r.student_id,
            relationship: r.relationship,
            students: student || null,
            profiles: r.profiles,
          };
        }).filter((r: Record<string, unknown>) => r.students !== null);
      }
    }

    const sourceRows = (rows && rows.length > 0) ? rows : fallbackRows;

    // Fetch class teacher names
    const teacherIds = new Set<string>();
    (sourceRows || []).forEach((r: Record<string, unknown>) => {
      const student = r.students as Record<string, unknown> | null;
      const cls = student?.classes as Record<string, unknown> | null;
      if (cls?.class_teacher_id) teacherIds.add(cls.class_teacher_id);
    });

    let teacherMap = new Map<string, string>();
    if (teacherIds.size > 0) {
      const { data: teachers } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(teacherIds));
      (teachers || []).forEach((t: Record<string, unknown>) => {
        teacherMap.set(t.id as string, t.full_name as string);
      });
    }

    const children = (sourceRows || []).map((r: Record<string, unknown>) => {
      const student = r.students as Record<string, unknown> | null;
      const profile = student?.profiles as Record<string, unknown> | null;
      const cls = student?.classes as Record<string, unknown> | null;
      const teacherName = cls?.class_teacher_id ? teacherMap.get(cls.class_teacher_id as string) : null;

      return {
        id: r.student_id as string,
        student_id: (student?.id as string) || "",
        full_name: (profile?.full_name as string) || "Unknown",
        admission_number: (student?.admission_number as string) || "",
        grade_level: (student?.grade_level as string) || (cls?.grade_level as string) || null,
        class_name: (cls?.name as string) || null,
        class_teacher_name: teacherName || null,
        avatar_url: (profile?.avatar_url as string) || null,
        relationship: (r.relationship as string) || null,
      };
    });

    return NextResponse.json({ children });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/children] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
