import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const resource_type = searchParams.get("resource_type");

    const { data, error } = await admin
      .from("library_resources")
      .select("id, title, author, isbn, resource_type, available_copies, total_copies, cover_url, file_url, grade_levels, subject_id, campus_id, created_at")
      .eq(resource_type ? "resource_type" : "id", resource_type || "")
      .order("title", { ascending: true });

    if (error) return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
    return NextResponse.json({ resources: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[library GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "library.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();

    interface LibraryResourceRow {
      id: string;
      title: string;
      author: string | null;
      isbn: string | null;
      resource_type: string;
      available_copies: number | null;
      total_copies: number | null;
      cover_url: string | null;
      file_url: string | null;
      grade_levels: string[] | null;
      subject_id: string | null;
      campus_id: string | null;
      created_by: string | null;
      created_at: string | null;
    }

    const { data, error } = await admin
      .from("library_resources")
      .insert({ ...body, created_by: session.userId })
      .select("id, title, author, isbn, resource_type, available_copies, total_copies, cover_url, file_url, grade_levels, subject_id, campus_id, created_at")
      .maybeSingle() as { data: LibraryResourceRow | null; error: any };

    if (error) return NextResponse.json({ error: "Failed to add resource" }, { status: 500 });
    return NextResponse.json({ success: true, resource: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[library POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
