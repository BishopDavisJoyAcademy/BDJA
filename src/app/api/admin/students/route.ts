import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStudent } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.view");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const gradeFilter = searchParams.get("grade");
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("q");

    if (id) {
      const { data, error } = await admin
        .from("profiles")
        .select("*, students(*)")
        .eq("id", id)
        .eq("user_category", "student")
        .maybeSingle();

      if (error) {
        console.error("[students GET] Single fetch error:", error.message);
        return NextResponse.json({ error: "Database error fetching student" }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      return NextResponse.json({ student: data });
    }

    let query = admin
      .from("profiles")
      .select("*, students(*)")
      .eq("user_category", "student")
      .order("created_at", { ascending: false });

    if (gradeFilter && gradeFilter !== "all") {
      query = query.filter("students.grade_level", "eq", gradeFilter);
    }

    if (statusFilter === "active") {
      query = query.eq("is_active", true);
    } else if (statusFilter === "inactive") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[students GET] List fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    let result = data || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row: Record<string, unknown>) => {
        const fullName = String(row.full_name || "").toLowerCase();
        const admission = String((row.students as Record<string, unknown> | null)?.admission_number || "").toLowerCase();
        return fullName.includes(q) || admission.includes(q);
      });
    }

    return NextResponse.json({ students: result, count: result.length });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[students GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.create");

    const body = await req.json();
    const action = body.action || "create";

    if (action === "generate_credentials") {
      return handleGenerateCredentials(body, session, req);
    }

    if (action !== "create") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return handleCreateStudent(body, session, req);
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
    console.error("[students POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleCreateStudent(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const fullName = String(body.full_name || "").trim();
  const admissionNumber = String(body.admission_number || "").trim();
  const gradeLevel = String(body.grade_level || "").trim();
  const phone = String(body.phone || "").trim() || undefined;
  const classId = body.class_id ? String(body.class_id) : undefined;
  const campusId = body.campus_id ? String(body.campus_id) : undefined;
  const parentId = body.parent_id ? String(body.parent_id) : undefined;

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required", field: "full_name" }, { status: 400 });
  }
  if (!admissionNumber) {
    return NextResponse.json({ error: "Admission number is required", field: "admission_number" }, { status: 400 });
  }
  if (!gradeLevel) {
    return NextResponse.json({ error: "Grade level is required", field: "grade_level" }, { status: 400 });
  }

  // Check admission number uniqueness — NO REGEX, only DB check
  const { data: existingAdmission } = await admin
    .from("students")
    .select("id")
    .eq("admission_number", admissionNumber)
    .maybeSingle();

  if (existingAdmission) {
    return NextResponse.json(
      { error: `Admission number "${admissionNumber}" already exists`, field: "admission_number" },
      { status: 409 }
    );
  }

  try {
    const result = await createStudent({
      fullName,
      phone,
      admissionNumber,
      gradeLevel,
      classId,
      campusId,
      parentId,
      createdBy: session.userId,
    });

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_CREATED",
      table_name: "students",
      record_id: result.studentId,
      new_data: { full_name: fullName, admission_number: admissionNumber, grade_level: gradeLevel },
      ip_address: getClientIP(req),
    });

    return NextResponse.json({
      success: true,
      student: {
        id: result.studentId,
        full_name: fullName,
        admission_number: admissionNumber,
        grade_level: gradeLevel,
      },
      credentials: {
        admissionNumber: result.admissionNumber,
        tempPassword: result.tempPassword,
      },
      message: "Student created successfully. Credentials displayed below.",
    });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("[students POST] Create failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleGenerateCredentials(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();
  const id = String(body.id || "");

  if (!id) {
    return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
  }

  // Verify student exists
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, user_category, phone")
    .eq("id", id)
    .eq("user_category", "student")
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Get admission number
  const { data: studentRecord } = await admin
    .from("students")
    .select("admission_number")
    .eq("id", id)
    .maybeSingle();

  const admissionNumber = studentRecord?.admission_number || "N/A";

  // Generate new 4-digit PIN for students
  const { generatePIN, hashPassword } = await import("@/lib/security");
  const newPin = generatePIN();
  const passwordHash = await hashPassword(newPin);

  // Update auth user password
  const { error: updateAuthError } = await admin.auth.admin.updateUserById(id, {
    password: newPassword,
  });

  if (updateAuthError) {
    console.error("[students credentials] Auth update failed:", updateAuthError.message);
    return NextResponse.json({ error: "Failed to update auth password" }, { status: 500 });
  }

  // Update profile
  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      temp_password_hash: passwordHash,
      password_changed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (profileUpdateError) {
    console.error("[students credentials] Profile update failed:", profileUpdateError.message);
  }

  await logAudit({
    user_id: session.userId,
    action: "STUDENT_CREDENTIALS_REGENERATED",
    table_name: "students",
    record_id: id,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({
    success: true,
    credentials: {
      id: profile.id,
      fullName: profile.full_name,
      admissionNumber,
      tempPassword: newPin,
      phone: profile.phone,
    },
    message: "New PIN generated successfully",
  });
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.edit");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const body = await req.json();

    const { error: profileError } = await admin.from("profiles").update({
      full_name: body.full_name,
      phone: body.phone || null,
      campus_id: body.campus_id || null,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (profileError) {
      console.error("[students PUT] Profile update error:", profileError.message);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    const { error: studentError } = await admin.from("students").update({
      admission_number: body.admission_number,
      grade_level: body.grade_level,
      class_id: body.class_id || null,
      campus_id: body.campus_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (studentError) {
      console.error("[students PUT] Student update error:", studentError.message);
      return NextResponse.json({ error: "Failed to update student record" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_UPDATED",
      table_name: "students",
      record_id: id,
      new_data: body,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, message: "Student updated successfully" });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[students PUT] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.delete");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const { data: existing } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", id)
      .eq("user_category", "student")
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await admin.from("students").delete().eq("id", id);
    await admin.from("parent_students").delete().eq("student_id", id);
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_DELETED",
      table_name: "students",
      record_id: id,
      old_data: existing,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, message: "Student deleted successfully" });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[students DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.promote");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { id, new_grade_level, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("id", id)
      .eq("user_category", "student")
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (typeof is_active === "boolean") {
      const { error } = await admin.from("profiles").update({
        is_active: is_active,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (error) {
        console.error("[students PATCH] Status toggle error:", error.message);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
      }

      await logAudit({
        user_id: session.userId,
        action: is_active ? "STUDENT_ACTIVATED" : "STUDENT_DEACTIVATED",
        table_name: "students",
        record_id: id,
        ip_address: getClientIP(req),
      });

      return NextResponse.json({
        success: true,
        message: is_active ? "Student activated" : "Student deactivated",
      });
    }

    if (!new_grade_level) {
      return NextResponse.json({ error: "New grade level required for promotion" }, { status: 400 });
    }

    const { data: current } = await admin.from("students").select("grade_level").eq("id", id).single();
    const oldGrade = current?.grade_level || "";

    const { error } = await admin.from("students").update({
      grade_level: new_grade_level,
      class_id: body.new_class_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) {
      console.error("[students PATCH] Promotion error:", error.message);
      return NextResponse.json({ error: "Failed to promote student" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_PROMOTED",
      table_name: "students",
      record_id: id,
      old_data: { grade_level: oldGrade },
      new_data: { grade_level: new_grade_level, class_id: body.new_class_id },
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, message: "Student promoted successfully" });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[students PATCH] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
