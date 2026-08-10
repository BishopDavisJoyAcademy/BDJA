import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const { data, error } = await admin.from("cms_pages").select("*").eq("slug", slug).maybeSingle();
      if (error) return NextResponse.json({ error: "Page not found" }, { status: 404 });
      return NextResponse.json({ page: data });
    }

    const { data, error } = await admin.from("cms_pages").select("*").order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
    return NextResponse.json({ pages: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[pages GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "pages.edit");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { slug, title, content, meta_description, is_published } = body;

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "Slug, title, and content are required" }, { status: 400 });
    }

    const { data, error } = await admin.from("cms_pages").insert({
      slug,
      title,
      content,
      meta_description,
      is_published: is_published ?? false,
      last_edited_by: session.userId,
    } as { slug: string; title: string; content: string; meta_description: string | null; is_published: boolean | null; last_edited_by: string }).select().maybeSingle();

    if (error) return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
    return NextResponse.json({ success: true, page: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[pages POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "pages.edit");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { id, slug, title, content, meta_description, is_published } = body;

    if (!id) return NextResponse.json({ error: "Page ID required" }, { status: 400 });

    const { data, error } = await admin.from("cms_pages").update({
      slug,
      title,
      content,
      meta_description,
      is_published,
      last_edited_by: session.userId,
      updated_at: new Date().toISOString(),
    }).eq("id", id).select().maybeSingle();

    if (error) return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
    return NextResponse.json({ success: true, page: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[pages PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
