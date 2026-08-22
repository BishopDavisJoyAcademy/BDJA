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
    requirePermission(session, "subjects.view");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await admin.from("subjects").select("*").eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      return NextResponse.json({ subject: data });
    }

    const { data, error } = await admin.from("subjects").select("*").order("name", { ascending: true });
    if (error) return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
    return NextResponse.json({ subjects: data || [] });
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
    requirePermission(session, "subjects.create");
    const admin = getSupabaseAdmin();
    const body = await req.json();

    if (!body.name) return NextResponse.json({ error: "Subject name is required" }, { status: 400 });

    const { data, error } = await admin.from("subjects").insert([{
      name: body.name,
      code: body.code || null,
      grade_levels: body.grade_levels || null,
      created_by: session.userId,
    }]).select().single();

    if (error) return NextResponse.json({ error: error.message || "Failed to create subject" }, { status: 500 });

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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "subjects.edit");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Subject ID required" }, { status: 400 });
    const body = await req.json();

    const { data: existing } = await admin.from("subjects").select("*").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    const { error } = await admin.from("subjects").update({
      name: body.name,
      code: body.code || null,
      grade_levels: body.grade_levels || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });

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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "subjects.delete");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Subject ID required" }, { status: 400 });

    const { error } = await admin.from("subjects").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });

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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
