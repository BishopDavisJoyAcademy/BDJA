import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface LinkedClass {
  id: string;
  name: string;
  grade_level: string;
  teacher_name: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const withLinked = searchParams.get("linked") === "true";

    if (id) {
      const { data, error } = await admin.from("subjects").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[subjects GET] Single fetch error:", error.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      if (!data) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

      let linkedClasses: LinkedClass[] = [];
      if (withLinked) {
        const { data: linkedData } = await admin
          .from("class_subjects")
          .select("*, classes(id, name, grade_level), profiles!class_subjects_teacher_id_fkey(full_name)")
          .eq("subject_id", id);
        linkedClasses = (linkedData || []).map((row) => ({
          id: String(row.classes?.id || row.id),
          name: String(row.classes?.name || ""),
          grade_level: String(row.classes?.grade_level || ""),
          teacher_name: String(row.profiles?.full_name || ""),
        }));
      }

      return NextResponse.json({ subject: data, linkedClasses });
    }

    const { data, error } = await admin.from("subjects").select("*").order("name", { ascending: true });
    if (error) {
      console.error("[subjects GET] List fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
    }
    return NextResponse.json({ subjects: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[subjects GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    const { data, error } = await admin.from("subjects").insert({
      name: String(body.name).trim(),
      code: body.code || null,
      grade_levels: body.grade_levels || null,
      description: body.description || null,
      grading_scales: body.grading_scales || null,
      curriculum_strands: body.curriculum_strands || null,
    }).select().single();

    if (error) {
      console.error("[subjects POST] Create error:", error.message);
      return NextResponse.json({ error: error.message || "Failed to create subject" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "SUBJECT_CREATED",
      table_name: "subjects",
      record_id: data.id,
      new_data: body,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, subject: data });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[subjects POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Subject ID required" }, { status: 400 });

    const body = await req.json();

    const { data: existing } = await admin.from("subjects").select("*").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    const updateData: {
      name?: string;
      code?: string | null;
      grade_levels?: string[] | null;
      description?: string | null;
      grading_scales?: unknown;
      curriculum_strands?: unknown;
    } = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.code !== undefined) updateData.code = body.code || null;
    if (body.grade_levels !== undefined) updateData.grade_levels = body.grade_levels || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.grading_scales !== undefined) updateData.grading_scales = body.grading_scales || null;
    if (body.curriculum_strands !== undefined) updateData.curriculum_strands = body.curriculum_strands || null;

    const { error } = await admin.from("subjects").update(updateData).eq("id", id);

    if (error) {
      console.error("[subjects PUT] Update error:", error.message);
      return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "SUBJECT_UPDATED",
      table_name: "subjects",
      record_id: id,
      old_data: existing,
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
    console.error("[subjects PUT] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Subject ID required" }, { status: 400 });

    // Check if subject is assigned to any classes
    const { data: assignments } = await admin
      .from("class_subjects")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", id);

    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete subject assigned to classes. Remove assignments first." },
        { status: 400 }
      );
    }

    const { error } = await admin.from("subjects").delete().eq("id", id);
    if (error) {
      console.error("[subjects DELETE] Delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "SUBJECT_DELETED",
      table_name: "subjects",
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
    console.error("[subjects DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
