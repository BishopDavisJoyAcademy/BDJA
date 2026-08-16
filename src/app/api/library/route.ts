import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");

    if (id) {
      const { data, error } = await admin.from("library_resources").select("*").eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
      return NextResponse.json({ resource: data });
    }

    let query = admin.from("library_resources").select("*").eq("is_published", true);
    if (type) query = query.eq("resource_type", type);
    if (grade) query = query.eq("grade_level", grade);
    if (subject) query = query.eq("subject", subject);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
    return NextResponse.json({ resources: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    if (!body.title || !body.resource_type) {
      return NextResponse.json({ error: "Title and resource type are required" }, { status: 400 });
    }
    const { data, error } = await admin.from("library_resources").insert([{
      title: body.title,
      author: body.author || null,
      description: body.description || null,
      resource_type: body.resource_type,
      grade_level: body.grade_level || null,
      subject: body.subject || null,
      url: body.url || null,
      file_path: body.file_path || null,
      is_published: body.is_published ?? true,
      created_by: session.userId,
    }]).select().single();
    if (error) return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
    await logAudit({
      user_id: session.userId,
      action: "LIBRARY_RESOURCE_CREATED",
      table_name: "library_resources",
      record_id: data.id,
      new_data: { title: body.title },
      ip_address: getClientIP(req),
    });
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
