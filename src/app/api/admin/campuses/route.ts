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
    requirePermission(session, "campuses.view");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await admin.from("campuses").select("*").eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Campus not found" }, { status: 404 });
      return NextResponse.json({ campus: data });
    }

    const { data: campuses, error } = await admin.from("campuses").select("*").order("name", { ascending: true });
    if (error) return NextResponse.json({ error: "Failed to fetch campuses" }, { status: 500 });

    const campusList = campuses || [];
    const enriched = await Promise.all(
      campusList.map(async (campus: Record<string, unknown>) => {
        const [{ count: studentCount }, { count: staffCount }] = await Promise.all([
          admin.from("profiles").select("id", { count: "exact", head: true }).eq("campus_id", campus.id).eq("user_category", "student"),
          admin.from("profiles").select("id", { count: "exact", head: true }).eq("campus_id", campus.id).eq("user_category", "staff"),
        ]);
        return {
          ...campus,
          student_count: studentCount || 0,
          staff_count: staffCount || 0,
        };
      })
    );

    return NextResponse.json({ campuses: enriched });
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
    requirePermission(session, "campuses.create");

    const body = await req.json();
    const admin = getSupabaseAdmin();

    if (!body.name || !body.location) {
      return NextResponse.json({ error: "Name and location are required" }, { status: 400 });
    }

    const { data, error } = await admin.from("campuses").insert([{
      name: body.name,
      location: body.location,
      phone: body.phone || null,
      email: body.email || null,
    }]).select().single();

    if (error) return NextResponse.json({ error: error.message || "Failed to create campus" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "CREATE",
      table_name: "campuses",
      record_id: data.id,
      new_data: body,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, campus: data });
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
    requirePermission(session, "campuses.edit");

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Campus ID is required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: current } = await admin.from("campuses").select("*").eq("id", id).maybeSingle();

    const { data, error } = await admin.from("campuses").update(updates).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message || "Failed to update campus" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "UPDATE",
      table_name: "campuses",
      record_id: id,
      old_data: current,
      new_data: updates,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, campus: data });
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
    requirePermission(session, "campuses.delete");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Campus ID is required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: current } = await admin.from("campuses").select("*").eq("id", id).maybeSingle();

    const { error } = await admin.from("campuses").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message || "Failed to delete campus" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "DELETE",
      table_name: "campuses",
      record_id: id,
      old_data: current,
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
