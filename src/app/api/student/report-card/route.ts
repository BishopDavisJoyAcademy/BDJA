import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface AssessmentRow {
  id: string;
  subject_id: string;
  strand: string;
  sub_strand: string;
  specific_learning_outcome: string | null;
  score: number | null;
  max_score: number | null;
  performance_level: string;
  term: string;
  academic_year: string;
  subjects: { name: string | null; code: string | null } | null;
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const term = searchParams.get("term");
    const academicYear = searchParams.get("academic_year");

    if (!term || !academicYear) {
      return NextResponse.json({ error: "term and academic_year are required" }, { status: 400 });
    }

    const studentId = session.userId;

    // Get student info
    const { data: student } = await admin
      .from("students")
      .select("*, classes:class_id(name, grade_level, class_teacher_id), profiles:student_id(full_name, email, avatar_url)")
      .eq("id", studentId)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get class teacher info
    let teacherName = "";
    if (student.classes?.class_teacher_id) {
      const { data: teacher } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", student.classes.class_teacher_id)
        .maybeSingle();
      teacherName = teacher?.full_name || "";
    }

    // Get assessments for term/year
    const { data: rawAssessments } = await admin
      .from("assessments")
      .select(`
        id, subject_id, strand, sub_strand, specific_learning_outcome,
        score, max_score, performance_level, term, academic_year,
        subjects!assessments_subject_id_fkey(name, code)
      `)
      .eq("student_id", studentId)
      .eq("term", term)
      .eq("academic_year", academicYear)
      .order("subject_id");

    const assessments = (rawAssessments || []).map((a) => {
      const row = a as unknown as AssessmentRow;
      return {
        id: row.id,
        subject_id: row.subject_id,
        subject_name: row.subjects?.name || "Unknown Subject",
        subject_code: row.subjects?.code || "",
        strand: row.strand,
        sub_strand: row.sub_strand,
        specific_learning_outcome: row.specific_learning_outcome,
        score: row.score,
        max_score: row.max_score,
        performance_level: row.performance_level,
      };
    });

    // Group by subject
    const subjectGroups = new Map<string, typeof assessments>();
    assessments.forEach((a) => {
      if (!subjectGroups.has(a.subject_id)) subjectGroups.set(a.subject_id, []);
      subjectGroups.get(a.subject_id)!.push(a);
    });

    const subjectSummaries = Array.from(subjectGroups.entries()).map(([subjectId, items]) => {
      const totalScore = items.reduce((s, i) => s + (i.score || 0), 0);
      const totalMax = items.reduce((s, i) => s + (i.max_score || 100), 0);
      const avg = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
      const subjectName = items[0]?.subject_name || "Unknown";
      return {
        subject_id: subjectId,
        subject_name: subjectName,
        average: avg,
        total_score: totalScore,
        total_max: totalMax,
        strand_count: items.length,
        assessments: items,
      };
    });

    // Get attendance stats
    const startDate = `${academicYear}-01-01`;
    const endDate = `${academicYear}-12-31`;
    const { data: attendanceRecords } = await admin
      .from("attendance")
      .select("status")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate);

    const attendanceStats: AttendanceStats = {
      total: attendanceRecords?.length || 0,
      present: attendanceRecords?.filter((r) => r.status === "present").length || 0,
      absent: attendanceRecords?.filter((r) => r.status === "absent").length || 0,
      late: attendanceRecords?.filter((r) => r.status === "late").length || 0,
      excused: attendanceRecords?.filter((r) => r.status === "excused").length || 0,
      rate: 0,
    };
    attendanceStats.rate = attendanceStats.total > 0
      ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
      : 0;

    // Get fee status
    const { data: feePayments } = await admin
      .from("fee_payments")
      .select("amount, status, fee_structures:fee_structure_id(total)")
      .eq("student_id", studentId)
      .eq("status", "verified");

    const totalPaid = feePayments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;

    // Get school settings
    const { data: settings } = await admin
      .from("platform_settings")
      .select("school_name, contact_email, contact_phone, address, logo_url, currency")
      .limit(1)
      .maybeSingle();

    // Get existing report card if published
    const { data: reportCard } = await admin
      .from("report_cards")
      .select("*")
      .eq("student_id", studentId)
      .eq("term", term)
      .eq("academic_year", academicYear)
      .maybeSingle();

    return NextResponse.json({
      student: {
        id: studentId,
        name: student.profiles?.full_name || "",
        email: student.profiles?.email || "",
        avatar_url: student.profiles?.avatar_url || null,
        admission_number: student.admission_number || "",
        class_name: student.classes?.name || "",
        grade_level: student.classes?.grade_level || "",
      },
      teacher: {
        name: teacherName,
      },
      term,
      academic_year: academicYear,
      assessments: subjectSummaries,
      attendance: attendanceStats,
      fees: {
        total_paid: totalPaid,
      },
      school: settings || {
        school_name: "Bishop Davis Joy Academy",
        contact_email: "",
        contact_phone: "",
        address: "",
        logo_url: null,
        currency: "KES",
      },
      report_card: reportCard || null,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[report-card GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
