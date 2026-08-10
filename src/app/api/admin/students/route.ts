import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStudent } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data: student, error } = await admin
        .from("profiles")
        .select("*, students(*)")
        .eq("id", id)
        .eq("user_category", "student")
        .maybeSingle();
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
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
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
    if (!body.email || !body.full_name || !body.admission_number || !body.grade_level) {
      return NextResponse.json({ error: "Email, full name, admission number, and grade level are required" }, { status: 400 });
    }

    const result = await createStudent({
      email: body.email,
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
      target_type: "student",
      target_id: result.userId,
      metadata: { email: body.email, admission_number: body.admission_number },
      ip_address: getClientIP(req),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[students POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create student" }, { status: 500 });
  }
}
