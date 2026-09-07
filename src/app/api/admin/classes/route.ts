import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "classes.view");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const campusFilter = searchParams.get("campus");
    const gradeFilter = searchParams.get("grade");
    const searchQuery = searchParams.get("q");
    const withRoster = searchParams.get("roster") === "true";

    if (id) {
      const { data: classData, error } = await admin
        .from("classes")
        .select("*, campuses(name), profiles!classes_class_teacher_id_fkey(full_name, email)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[classes GET] Single fetch error:", error.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      if (!classData) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }

      // Fetch assigned subjects with teachers
      const { data: subjectAssignments } = await admin
        .from("class_subjects")
        .select("*, subjects(id, name, code), profiles!class_subjects_teacher_id_fkey(full_name, email)")
        .eq("class_id", id);

      // Fetch roster if requested
      let roster = null;
      if (withRoster) {
        const { data: rosterData } = await admin
          .from("students")
          .select("*, profiles!students_profile_id_fkey(full_name, email, avatar_url, phone)")
          .eq("class_id", id)
          .eq("status", "active")
          .order("admission_number", { ascending: true });
        roster = rosterData || [];
      }

      return NextResponse.json({
        class: classData,
        subjectAssignments: subjectAssignments || [],
        roster,
      });
    }

    let query = admin
      .from("classes")
      .select("*, campuses(name), profiles!classes_class_teacher_id_fkey(full_name, email)")
      .order("grade_level", { ascending: true })
      .order("name", { ascending: true });

    if (campusFilter && campusFilter !== "all") {
      query = query.eq("campus_id", campusFilter);
    }

    if (gradeFilter && gradeFilter !== "all") {
      query = query.eq("grade_level", gradeFilter);
    }

    const { data: classes, error } = await query;

    if (error) {
      console.error("[classes GET] List fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
    }

    let result = classes || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row: Record<string, unknown>) => {
        const name = String(row.name || "").toLowerCase();
        const grade = String(row.grade_level || "").toLowerCase();
        const stream = String((row as Record<string, unknown>).stream || "").toLowerCase();
        const campusName = String((row.campuses as Record<string, unknown> | null)?.name || "").toLowerCase();
        return name.includes(q) || grade.includes(q) || stream.includes(q) || campusName.includes(q);
      });
    }

    // Get student counts for each class
    const classIds = result.map((c: Record<string, unknown>) => c.id);
    let studentCounts: Record<string, number> = {};
    if (classIds.length > 0) {
      const { data: counts } = await admin
        .from("students")
        .select("class_id, count")
        .in("class_id", classIds)
        .eq("status", "active")
        .group("class_id");

      if (counts) {
        for (const c of counts as Record<string, unknown>[]) {
          studentCounts[String(c.class_id)] = Number(c.count) || 0;
        }
      }
    }

    return NextResponse.json({ classes: result, studentCounts });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[classes GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "classes.create");

    const body = await req.json();
    const action = body.action || "create";

    if (action === "assign_subjects") {
      return handleAssignSubjects(body, session, req);
    }

    if (action === "remove_subject") {
      return handleRemoveSubject(body, session, req);
    }

    if (action !== "create") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return handleCreateClass(body, session, req);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 400 });
    }
    console.error("[classes POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleCreateClass(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const name = String(body.name || "").trim();
  const gradeLevel = String(body.grade_level || "").trim();
  const campusId = String(body.campus_id || "").trim();
  const classTeacherId = body.class_teacher_id ? String(body.class_teacher_id) : null;
  const stream = body.stream ? String(body.stream) : null;
  const capacity = body.capacity ? Number(body.capacity) : null;
  const room = body.room ? String(body.room) : null;
  const academicYear = String(body.academic_year || "").trim();

  if (!name) throw new ValidationError("Class name is required");
  if (!gradeLevel) throw new ValidationError("Grade level is required");
  if (!campusId) throw new ValidationError("Campus is required");
  if (!academicYear) throw new ValidationError("Academic year is required");

  // Verify campus exists
  const { data: campus } = await admin.from("campuses").select("id").eq("id", campusId).maybeSingle();
  if (!campus) throw new ValidationError("Invalid campus selected");

  // Verify class teacher exists and is staff
  if (classTeacherId) {
    const { data: teacher } = await admin
      .from("profiles")
      .select("id")
      .eq("id", classTeacherId)
      .eq("user_category", "staff")
      .maybeSingle();
    if (!teacher) throw new ValidationError("Invalid class teacher selected");
  }

  const { data, error } = await admin.from("classes").insert([{
    name,
    grade_level: gradeLevel,
    campus_id: campusId,
    class_teacher_id: classTeacherId,
    stream: stream || null,
    capacity: capacity || null,
    room: room || null,
    academic_year: academicYear,
    is_active: true,
  }]).select().single();

  if (error) {
    console.error("[classes POST] Create error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create class" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "CLASS_CREATED",
    table_name: "classes",
    record_id: data.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, class: data });
}

async function handleAssignSubjects(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();
  const classId = String(body.class_id || "");
  const assignments = body.assignments as Array<{ subject_id: string; teacher_id?: string | null }> || [];

  if (!classId) throw new ValidationError("Class ID is required");

  // Verify class exists
  const { data: classData } = await admin.from("classes").select("id").eq("id", classId).maybeSingle();
  if (!classData) throw new ValidationError("Class not found");

  // Insert assignments
  const inserts = assignments.map((a) => ({
    class_id: classId,
    subject_id: a.subject_id,
    teacher_id: a.teacher_id || null,
  }));

  const { error } = await admin.from("class_subjects").insert(inserts);

  if (error) {
    console.error("[classes POST] Assign subjects error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to assign subjects" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "CLASS_SUBJECTS_ASSIGNED",
    table_name: "class_subjects",
    record_id: classId,
    new_data: { class_id: classId, assignments },
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true });
}

async function handleRemoveSubject(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();
  const assignmentId = String(body.assignment_id || "");

  if (!assignmentId) throw new ValidationError("Assignment ID is required");

  const { error } = await admin.from("class_subjects").delete().eq("id", assignmentId);

  if (error) {
    console.error("[classes POST] Remove subject error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to remove subject" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "CLASS_SUBJECT_REMOVED",
    table_name: "class_subjects",
    record_id: assignmentId,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "classes.edit");

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Class ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: existing } = await admin.from("classes").select("*").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = String(updates.name).trim();
    if (updates.grade_level !== undefined) updateData.grade_level = String(updates.grade_level).trim();
    if (updates.campus_id !== undefined) updateData.campus_id = String(updates.campus_id).trim();
    if (updates.class_teacher_id !== undefined) updateData.class_teacher_id = updates.class_teacher_id || null;
    if (updates.stream !== undefined) updateData.stream = updates.stream || null;
    if (updates.capacity !== undefined) updateData.capacity = updates.capacity ? Number(updates.capacity) : null;
    if (updates.room !== undefined) updateData.room = updates.room || null;
    if (updates.academic_year !== undefined) updateData.academic_year = String(updates.academic_year).trim();
    if (updates.is_active !== undefined) updateData.is_active = Boolean(updates.is_active);

    const { error } = await admin.from("classes").update(updateData).eq("id", id);

    if (error) {
      console.error("[classes PATCH] Update error:", error.message);
      return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "CLASS_UPDATED",
      table_name: "classes",
      record_id: id,
      old_data: existing,
      new_data: updateData,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[classes PATCH] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "classes.delete");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Class ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Check if class has students
    const { data: studentCount } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", id);

    if (studentCount && studentCount.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete class with enrolled students. Transfer students first." },
        { status: 400 }
      );
    }

    const { error } = await admin.from("classes").delete().eq("id", id);

    if (error) {
      console.error("[classes DELETE] Delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "CLASS_DELETED",
      table_name: "classes",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[classes DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
