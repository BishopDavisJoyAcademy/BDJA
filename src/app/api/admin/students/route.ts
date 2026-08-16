import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStudent } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      interface StudentDetailRow {
        id: string;
        email: string;
        full_name: string;
        role: string;
        user_category: string;
        campus_id: string | null;
        is_active: boolean;
        students: { admission_number: string | null; grade_level: string | null; [key: string]: unknown }[] | null;
        [key: string]: unknown;
      }

      const { data: studentRaw, error } = await admin
        .from("profiles")
        .select("*, students(*)")
        .eq("id", id)
        .eq("user_category", "student")
        .maybeSingle();
      const student = studentRaw as StudentDetailRow | null;
      if (error) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      return NextResponse.json({ student });
    }

    const { data: students, error } = await admin
      .from("profiles")
      .select("*, students(*)")
      .eq("user_category", "student")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    return NextResponse.json({ students: students || [] });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[students GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.manage");

    const body = await req.json();
    if (!body.full_name || !body.admission_number || !body.grade_level) {
      return NextResponse.json({ error: "Full name, admission number, and grade level are required" }, { status: 400 });
    }

    // Generate placeholder email if not provided
    const email = body.email || `${body.admission_number.toLowerCase().replace(/[^a-z0-9]/g, "")}@bdja.student`;

    const result = await createStudent({
      email,
      fullName: body.full_name,
      phone: body.phone,
      admissionNumber: body.admission_number,
      gradeLevel: body.grade_level,
      classId: body.class_id,
      campusId: body.campus_id,
      parentId: body.parent_id,
      createdBy: session.userId,
    });

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_CREATED",
      table_name: "student",
      record_id: result.userId,
      new_data: { email, admission_number: body.admission_number, grade_level: body.grade_level },
      ip_address: getClientIP(req),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[students POST] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to create student" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    const body = await req.json();

    const { error: profileError } = await admin.from("profiles").update({
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      campus_id: body.campus_id || null,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (profileError) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    await admin.from("students").update({
      admission_number: body.admission_number,
      grade_level: body.grade_level,
      class_id: body.class_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_UPDATED",
      table_name: "student",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, message: "Student updated" });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[students PUT] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    const { error } = await admin.from("profiles").update({
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) return NextResponse.json({ error: "Failed to deactivate student" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_DEACTIVATED",
      table_name: "student",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[students DELETE] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to deactivate student" }, { status: 500 });
  }
}
