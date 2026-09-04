import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface GradeRow {
  id: string;
  subject_id: string;
  strand: string;
  sub_strand: string;
  score: number | null;
  max_score: number | null;
  performance_level: string;
  term: string;
  academic_year: string;
  subjects: { name: string | null; code: string | null } | null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { id: studentId } = await params;

    // Verify teacher has access to this student
    const { data: student } = await admin
      .from("students")
      .select("class_id")
      .eq("id", studentId)
      .maybeSingle();

    if (!student?.class_id) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check teacher is class teacher or teaches a subject in this class
    const [{ data: ctClass }, { data: csSubjects }] = await Promise.all([
      admin.from("classes").select("id").eq("id", student.class_id).eq("class_teacher_id", session.userId).maybeSingle(),
      admin.from("class_subjects").select("id").eq("class_id", student.class_id).eq("teacher_id", session.userId).limit(1),
    ]);

    if (!ctClass && (!csSubjects || csSubjects.length === 0) && session.userCategory !== "admin") {
      return NextResponse.json({ error: "You do not have access to this student" }, { status: 403 });
    }

    // Fetch student profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name, email, avatar_url, phone, date_of_birth, gender, address")
      .eq("id", studentId)
      .maybeSingle();

    // Fetch student record
    const { data: studentRecord } = await admin
      .from("students")
      .select("*, classes:class_id(name, grade_level, class_teacher_id)")
      .eq("id", studentId)
      .maybeSingle();

    // Fetch class teacher name
    let classTeacherName = "";
    if (studentRecord?.classes?.class_teacher_id) {
      const { data: teacher } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", studentRecord.classes.class_teacher_id)
        .maybeSingle();
      classTeacherName = teacher?.full_name || "";
    }

    // Fetch grades
    const { data: rawGrades } = await admin
      .from("assessments")
      .select(`
        id, subject_id, strand, sub_strand, score, max_score, performance_level, term, academic_year,
        subjects!assessments_subject_id_fkey(name, code)
      `)
      .eq("student_id", studentId)
      .order("academic_year", { ascending: false })
      .order("term");

    const grades = (rawGrades || []).map((g) => {
      const row = g as unknown as GradeRow;
      return {
        id: row.id,
        subject_id: row.subject_id,
        subject_name: row.subjects?.name || "Unknown",
        subject_code: row.subjects?.code || "",
        strand: row.strand,
        sub_strand: row.sub_strand,
        score: row.score,
        max_score: row.max_score,
        performance_level: row.performance_level,
        term: row.term,
        academic_year: row.academic_year,
      };
    });

    // Group grades by term/year
    const termGroups = new Map<string, typeof grades>();
    grades.forEach((g) => {
      const key = `${g.academic_year} ${g.term}`;
      if (!termGroups.has(key)) termGroups.set(key, []);
      termGroups.get(key)!.push(g);
    });

    const termSummaries = Array.from(termGroups.entries()).map(([key, items]) => {
      const totalScore = items.reduce((s, i) => s + (i.score || 0), 0);
      const totalMax = items.reduce((s, i) => s + (i.max_score || 100), 0);
      return {
        term_key: key,
        academic_year: key.split(" ")[0],
        term: key.split(" ")[1],
        average: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
        grade_count: items.length,
        grades: items,
      };
    });

    // Fetch attendance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: attendance } = await admin
      .from("attendance")
      .select("date, status, notes")
      .eq("student_id", studentId)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(30);

    const attendanceStats = {
      total: attendance?.length || 0,
      present: attendance?.filter((a) => a.status === "present").length || 0,
      absent: attendance?.filter((a) => a.status === "absent").length || 0,
      late: attendance?.filter((a) => a.status === "late").length || 0,
      excused: attendance?.filter((a) => a.status === "excused").length || 0,
    };

    // Fetch assignment submissions
    const { data: submissions } = await admin
      .from("assignment_submissions")
      .select(`
        id, assignment_id, submitted_at, status, grade, content,
        assignments:assignment_id(title, due_date, max_score, subject_id, subjects:subject_id(name))
      `)
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      student: {
        id: studentId,
        name: profile?.full_name || "",
        email: profile?.email || "",
        avatar_url: profile?.avatar_url || null,
        phone: profile?.phone || "",
        date_of_birth: profile?.date_of_birth || null,
        gender: profile?.gender || "",
        address: profile?.address || "",
        admission_number: studentRecord?.admission_number || "",
        class_name: studentRecord?.classes?.name || "",
        grade_level: studentRecord?.classes?.grade_level || "",
        status: studentRecord?.status || "",
        class_teacher: classTeacherName,
      },
      term_summaries: termSummaries,
      attendance: {
        stats: attendanceStats,
        recent: attendance || [],
      },
      submissions: submissions || [],
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[teacher/student-detail GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
