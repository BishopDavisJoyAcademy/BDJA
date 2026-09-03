import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET — role-scoped assignment list
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const subjectId = searchParams.get("subject_id");
    const status = searchParams.get("status");

    let query = admin.from("assignments")
      .select(`
        id, title, description, due_date, status, max_score, attachments, rubric, created_at,
        class_id, subject_id, teacher_id,
        classes!assignments_class_id_fkey(name, grade_level),
        subjects!assignments_subject_id_fkey(name, code)
      `);

    // Role-based filtering
    if (session.userCategory === "student") {
      // Get student's class_id
      const { data: student } = await admin
        .from("students")
        .select("class_id")
        .eq("id", session.userId)
        .maybeSingle();
      if (!student?.class_id) {
        return NextResponse.json({ assignments: [] });
      }
      query = query.eq("class_id", student.class_id);
    } else if (session.userCategory === "parent") {
      // Get parent's children's class_ids
      const { data: children } = await admin
        .from("parent_children")
        .select("student_id")
        .eq("parent_id", session.userId);
      const childIds = children?.map((c) => c.student_id) || [];
      if (childIds.length === 0) return NextResponse.json({ assignments: [] });

      const { data: students } = await admin
        .from("students")
        .select("class_id")
        .in("id", childIds);
      const classIds = [...new Set(students?.map((s) => s.class_id).filter(Boolean) || [])];
      if (classIds.length === 0) return NextResponse.json({ assignments: [] });
      query = query.in("class_id", classIds);
    } else if (session.userCategory === "staff") {
      // Teacher sees assignments for:
      // 1. Classes where they are class_teacher_id
      // 2. Class_subjects where they are the teacher
      const [{ data: ctClasses }, { data: csSubjects }] = await Promise.all([
        admin.from("classes").select("id").eq("class_teacher_id", session.userId),
        admin.from("class_subjects").select("class_id, subject_id").eq("teacher_id", session.userId),
      ]);

      const ctClassIds = ctClasses?.map((c) => c.id) || [];
      const csClassIds = csSubjects?.map((c) => c.class_id) || [];
      const allClassIds = [...new Set([...ctClassIds, ...csClassIds])];

      if (allClassIds.length === 0) {
        return NextResponse.json({ assignments: [] });
      }
      query = query.in("class_id", allClassIds);
    }
    // Admin sees all (no filter)

    if (classId) query = query.eq("class_id", classId);
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query.order("due_date", { ascending: true });
    if (error) {
      console.error("[assignments GET] Query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }

    // Flatten joined data
    const assignments = (data || []).map((a: Record<string, unknown>) => ({
      ...a,
      class_name: (a.classes as Record<string, string> | null)?.name || null,
      grade_level: (a.classes as Record<string, string> | null)?.grade_level || null,
      subject_name: (a.subjects as Record<string, string> | null)?.name || null,
      subject_code: (a.subjects as Record<string, string> | null)?.code || null,
    }));

    return NextResponse.json({ assignments });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[assignments GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create assignment (teacher/admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "assignments.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();

    // Validate teacher owns this class/subject
    if (session.userCategory === "staff") {
      const { class_id, subject_id } = body;
      if (!class_id || !subject_id) {
        return NextResponse.json({ error: "class_id and subject_id are required" }, { status: 400 });
      }

      // Check if teacher is class teacher OR teaches this subject in this class
      const [{ data: ctClass }, { data: csEntry }] = await Promise.all([
        admin.from("classes").select("id").eq("id", class_id).eq("class_teacher_id", session.userId).maybeSingle(),
        admin.from("class_subjects").select("id").eq("class_id", class_id).eq("subject_id", subject_id).eq("teacher_id", session.userId).maybeSingle(),
      ]);

      if (!ctClass && !csEntry) {
        return NextResponse.json(
          { error: "You do not have permission to create assignments for this class/subject" },
          { status: 403 }
        );
      }
    }

    const insertData = {
      title: body.title,
      description: body.description,
      due_date: body.due_date,
      class_id: body.class_id,
      subject_id: body.subject_id,
      teacher_id: session.userId,
      max_score: body.max_score || 100,
      status: body.status || "published",
      attachments: body.attachments || null,
      rubric: body.rubric || null,
    };

    const { data, error } = await admin.from("assignments")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[assignments POST] Insert error:", error.message);
      return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
    }

    // Audit log
    await logAudit({
      user_id: session.userId,
      action: "ASSIGNMENT_CREATED",
      table_name: "assignments",
      record_id: data?.id,
      new_data: insertData,
      ip_address: getClientIP(req),
    }).catch(() => {});

    return NextResponse.json({ success: true, assignment: data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[assignments POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
