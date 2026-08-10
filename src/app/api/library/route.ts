import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    let query = admin.from("library_books").select("*");
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data, error } = await query.order("title", { ascending: true });
    if (error) return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
    return NextResponse.json({ books: data || [] });
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
    const { data, error } = await admin.from("library_books").insert(body).select().single();

    if (error) return NextResponse.json({ error: "Failed to add book" }, { status: 500 });
    return NextResponse.json({ success: true, book: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[library POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
