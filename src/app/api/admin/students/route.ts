import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.view");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await admin
        .from("profiles")
        .select("*, students(*)")
        .eq("id", id)
        .eq("user_category", "student")
        .maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      return NextResponse.json({ student: data });
    }

    const { data, error } = await admin
      .from("profiles")
      .select("*, students(*)")
      .eq("user_category", "student")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    return NextResponse.json({ students: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.create");
    const admin = getSupabaseAdmin();
    const body = await req.json();

    if (!body.email || !body.full_name || !body.admission_number || !body.grade_level) {
      return NextResponse.json({ error: "Email, full name, admission number, and grade level are required" }, { status: 400 });
    }

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(2, 10) + "A1!";

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
    });
    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Failed to create auth user" }, { status: 500 });
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await admin.from("profiles").insert([{
      id: userId,
      email: body.email,
      full_name: body.full_name,
      role: "student",
      user_category: "student",
      phone: body.phone || null,
      campus_id: body.campus_id || null,
      is_active: true,
      password_changed: false,
      onboarding_completed: false,
    }]).select().single();

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    const { error: studentError } = await admin.from("students").insert([{
      id: userId,
      profile_id: userId,
      admission_number: body.admission_number,
      grade_level: body.grade_level,
      class_id: body.class_id || null,
      campus_id: body.campus_id || null,
    }]);

    if (studentError) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create student record" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_CREATED",
      table_name: "students",
      record_id: userId,
      new_data: { full_name: body.full_name, admission_number: body.admission_number, grade_level: body.grade_level },
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, student: profile, tempPassword });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.edit");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    const body = await req.json();

    const { error: profileError } = await admin.from("profiles").update({
      full_name: body.full_name,
      email: body.email,
      phone: body.phone || null,
      campus_id: body.campus_id || null,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (profileError) return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });

    const { error: studentError } = await admin.from("students").update({
      admission_number: body.admission_number,
      grade_level: body.grade_level,
      class_id: body.class_id || null,
      campus_id: body.campus_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (studentError) return NextResponse.json({ error: "Failed to update student record" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_UPDATED",
      table_name: "students",
      record_id: id,
      new_data: body,
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
    if (!id) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    const { error: studentError } = await admin.from("students").delete().eq("id", id);
    if (studentError) return NextResponse.json({ error: "Failed to delete student record" }, { status: 500 });

    const { error: profileError } = await admin.from("profiles").delete().eq("id", id);
    if (profileError) return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });

    await admin.auth.admin.deleteUser(id);

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_DELETED",
      table_name: "students",
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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.promote");
    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { id, new_grade_level, new_class_id } = body;
    if (!id || !new_grade_level) return NextResponse.json({ error: "Student ID and new grade level required" }, { status: 400 });

    const { data: current } = await admin.from("students").select("grade_level").eq("id", id).single();
    const oldGrade = current?.grade_level || "";

    const { error } = await admin.from("students").update({
      grade_level: new_grade_level,
      class_id: new_class_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) return NextResponse.json({ error: "Failed to promote student" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_PROMOTED",
      table_name: "students",
      record_id: id,
      old_data: { grade_level: oldGrade },
      new_data: { grade_level: new_grade_level, class_id: new_class_id },
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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
