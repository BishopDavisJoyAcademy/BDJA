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

    let query = admin.from("admissions").select("*");
    if (status) query = query.eq("status", status);

    const { data, error } = await query.order("submitted_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch admissions" }, { status: 500 });
    return NextResponse.json({ admissions: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[admissions GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "admissions.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { data, error } = await admin.from("admissions").insert(body).select().single();

    if (error) return NextResponse.json({ error: "Failed to create admission" }, { status: 500 });
    return NextResponse.json({ success: true, admission: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[admissions POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
