import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStudent } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "students.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data: student, error } = await admin
        .from("profiles")
        .select("*, students(*)")
        .eq("id", id)
        .single();
      if (error) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      return NextResponse.json({ student });
    }

    const { data: students, error } = await admin
      .from("profiles")
      .select("*, students(*)")
      .eq("user_category", "student")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
    return NextResponse.json({ students: students || [] });
  } catch (error: any) {
    console.error("[api/admin/students GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "students.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = await createStudent({
      ...body,
      createdBy: user.id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/admin/students] POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create student" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "students.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    const body = await req.json();

    const { error: profileError } = await admin.from("profiles").update({
      full_name: body.full_name,
      campus_id: body.campus_id || null,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (profileError) {
      console.error("[students PUT] profile error:", profileError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    const { error: studentError } = await admin.from("students").update({
      admission_number: body.admission_number,
      grade_level: body.grade_level,
      class_id: body.class_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (studentError) {
      console.error("[students PUT] student error:", studentError);
    }

    return NextResponse.json({ success: true, message: "Student updated" });
  } catch (error: any) {
    console.error("[students PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update student" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "students.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    if (!id) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    // Reset PIN to 0000
    if (action === "reset-pin") {
      const { data: studentProfile } = await admin.from("profiles").select("email").eq("id", id).single();
      if (studentProfile?.email) {
        const { error: authError } = await admin.auth.admin.updateUserById(id, {
          password: "0000",
        });
        if (authError) {
          console.error("[students PATCH] reset pin auth error:", authError);
          return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
        }
        // Mark password as not changed so they must change on login
        await admin.from("profiles").update({ password_changed: false }).eq("id", id);
      }
      return NextResponse.json({ success: true, message: "PIN reset to 0000" });
    }

    // Promote to next grade
    if (action === "promote") {
      const body = await req.json();
      const { error } = await admin.from("students").update({
        grade_level: body.grade_level,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) {
        console.error("[students PATCH] promote error:", error);
        return NextResponse.json({ error: "Failed to promote" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `Promoted to ${body.grade_level}` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[students PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
