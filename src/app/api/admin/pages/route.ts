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
    requirePermission(session, "pages.manage");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");

    if (id) {
      const { data, error } = await admin.from("cms_pages").select("*").eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Page not found" }, { status: 404 });
      return NextResponse.json({ page: data });
    }

    if (slug) {
      const { data, error } = await admin.from("cms_pages").select("*").eq("slug", slug).maybeSingle();
      if (error || !data) return NextResponse.json({ page: null });
      return NextResponse.json({ page: data });
    }

    const { data: pages, error } = await admin.from("cms_pages").select("*").order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
    return NextResponse.json({ pages: pages || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[pages GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "pages.manage");
    const admin = getSupabaseAdmin();
    const body = await req.json();
    if (!body.slug || !body.title || !body.content) {
      return NextResponse.json({ error: "Slug, title, and content are required" }, { status: 400 });
    }
    const { data: existing } = await admin.from("cms_pages").select("id").eq("slug", body.slug).maybeSingle();
    if (existing) return NextResponse.json({ error: "A page with this slug already exists" }, { status: 409 });

    const { data, error } = await admin.from("cms_pages").insert([{
      slug: body.slug,
      title: body.title,
      content: body.content,
      meta_description: body.meta_description || null,
      meta_keywords: body.meta_keywords || null,
      is_published: body.is_published ?? false,
      last_edited_by: session.userId,
    }]).select().single();

    if (error) return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
    await logAudit({
      user_id: session.userId,
      action: "CMS_PAGE_CREATED",
      table_name: "cms_pages",
      record_id: data.id,
      new_data: { slug: body.slug, title: body.title },
      ip_address: getClientIP(req),
    });
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[pages POST] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to create page" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "pages.manage");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Page ID required" }, { status: 400 });
    const body = await req.json();
    const { error } = await admin.from("cms_pages").update({
      slug: body.slug,
      title: body.title,
      content: body.content,
      meta_description: body.meta_description || null,
      meta_keywords: body.meta_keywords || null,
      is_published: body.is_published ?? false,
      updated_at: new Date().toISOString(),
      last_edited_by: session.userId,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
    await logAudit({
      user_id: session.userId,
      action: "CMS_PAGE_UPDATED",
      table_name: "cms_pages",
      record_id: id,
      ip_address: getClientIP(req),
    });
    return NextResponse.json({ success: true, message: "Page updated" });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[pages PUT] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to update page" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "pages.manage");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Page ID required" }, { status: 400 });
    const { error } = await admin.from("cms_pages").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
    await logAudit({
      user_id: session.userId,
      action: "CMS_PAGE_DELETED",
      table_name: "cms_pages",
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
    console.error("[pages DELETE] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to delete page" }, { status: 500 });
  }
}
