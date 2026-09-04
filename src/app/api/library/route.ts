import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get("campus_id");
    const subjectId = searchParams.get("subject_id");
    const gradeLevel = searchParams.get("grade_level");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    let query = admin.from("library_resources").select("*");

    if (campusId) query = query.eq("campus_id", campusId);
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (gradeLevel) query = query.contains("grade_levels", [gradeLevel]);
    if (type) query = query.eq("resource_type", type);
    if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
    return NextResponse.json({ resources: data || [] });
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
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const { data, error } = await admin.from("library_resources").insert([{
      title: body.title,
      author: body.author || null,
      isbn: body.isbn || null,
      resource_type: body.resource_type,
      subject_id: body.subject_id || null,
      grade_levels: body.grade_levels || null,
      total_copies: body.total_copies || 1,
      available_copies: body.available_copies ?? (body.total_copies || 1),
      cover_url: body.cover_url || null,
      file_url: body.file_url || null,
      campus_id: body.campus_id || session.campusId,
      created_by: session.userId,
    }]).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, resource: data });
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
