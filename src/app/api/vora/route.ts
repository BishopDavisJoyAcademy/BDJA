import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { voraSearchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q") || "";
    const gradeLevel = searchParams.get("grade_level") || "all";
    const subject = searchParams.get("subject") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    let dbQuery = admin.from("vora_content").select("*");

    if (query) {
      const safeQuery = query.replace(/[%_]/g, "\$&");
      dbQuery = dbQuery.or(`title.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%,topic.ilike.%${safeQuery}%`);
    }
    if (gradeLevel && gradeLevel !== "all") {
      dbQuery = dbQuery.eq("grade_level", gradeLevel);
    }
    if (subject) {
      dbQuery = dbQuery.eq("subject", subject);
    }
    const { data, error } = await dbQuery.limit(limit).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
    return NextResponse.json({ content: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[vora GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const { data, error } = await admin.from("vora_content").insert({
      ...body,
    }).select().maybeSingle();

    if (error) return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
    return NextResponse.json({ success: true, content: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[vora POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
