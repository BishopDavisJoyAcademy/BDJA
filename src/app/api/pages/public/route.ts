import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    const admin = getSupabaseAdmin();

    if (slug) {
      const { data: page, error } = await admin
        .from("cms_pages")
        .select("id, slug, title, content, meta_description, meta_keywords, is_published, created_at, updated_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        console.error("[pages/public] Single fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 });
      }

      return NextResponse.json({ page });
    }

    // Return all published pages
    const { data: pages, error } = await admin
      .from("cms_pages")
      .select("id, slug, title, content, meta_description, meta_keywords, is_published, created_at, updated_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[pages/public] List error:", error);
      return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
    }

    return NextResponse.json({ pages: pages || [] });
  } catch (err: unknown) {
    console.error("[pages/public] Exception:", getErrorMessage(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
