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
        .eq("role", "student")
        .maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      return NextResponse.json({ student: data });
    }

    const { data, error } = await admin
      .from("profiles")
      .select("*, students(*)")
      .eq("role", "student")
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

    // Create auth user first so we have an ID for the profile
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: body.email,
      password: Math.random().toString(36).slice(2, 10) + "A1!",
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
      new_data: body,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, student: profile });
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
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (profileError) return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });

    const { error: studentError } = await admin.from("students").update({
      admission_number: body.admission_number,
      grade_level: body.grade_level,
      class_id: body.class_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (studentError) return NextResponse.json({ error: "Failed to update student" }, { status: 500 });

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

    const { error } = await admin.from("profiles").update({
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("role", "student");

    if (error) return NextResponse.json({ error: "Failed to deactivate student" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "STUDENT_DEACTIVATED",
      table_name: "profiles",
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
