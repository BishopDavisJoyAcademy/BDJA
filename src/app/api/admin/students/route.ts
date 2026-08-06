import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { createStudent, createParent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data, error: dbError } = await admin
      .from("profiles")
      .select("*, students(*), parent_students(parent:profiles(id, full_name, email))")
      .eq("user_category", "student")
      .order("created_at", { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ students: data || [] });
  } catch (error: any) {
    console.error("[api/admin/students] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as Record<string, any>;
    const {
      email,
      fullName,
      phone,
      admissionNumber,
      gradeLevel,
      classId,
      campusId,
      parentId,
      parentEmail,
      parentName,
      parentPhone,
    } = body;

    if (!email || !fullName || !admissionNumber || !gradeLevel) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    let linkedParentId = parentId;

    // Create parent if email and name provided
    if (!linkedParentId && parentEmail && parentName) {
      const parentResult = await createParent({
        email: parentEmail,
        fullName: parentName,
        phone: parentPhone,
        createdBy: session.userId,
      });
      linkedParentId = parentResult.parentId;
    }

    const result = await createStudent({
      email,
      fullName,
      phone,
      admissionNumber,
      gradeLevel,
      classId,
      campusId,
      parentId: linkedParentId,
      createdBy: session.userId,
    });

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_CREATED",
      target_type: "student",
      target_id: result.userId,
      metadata: { email, fullName, admissionNumber, gradeLevel, parent_id: linkedParentId },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      student: {
        id: result.userId,
        email: result.email,
        full_name: fullName,
        temp_password: result.tempPassword,
        parent_id: linkedParentId,
      },
    });
  } catch (error: any) {
    console.error("[api/admin/students] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create student" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    await admin.from("parent_students").delete().eq("student_id", id);
    await admin.from("students").delete().eq("id", id);
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id).catch(() => {});

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_DELETED",
      target_type: "student",
      target_id: id,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/admin/students] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
