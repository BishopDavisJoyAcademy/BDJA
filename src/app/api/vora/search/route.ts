import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");
    const campusId = searchParams.get("campus_id");

    let query = admin.from("vora_content").select("*");

    // Only show approved/public content, or content uploaded by the user
    query = query.or(`approved.eq.true,is_public.eq.true,uploaded_by.eq.${session.userId}`);

    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (grade) query = query.eq("grade_level", grade);
    if (subject) query = query.eq("subject", subject);
    if (campusId) query = query.eq("campus_id", campusId);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Search failed" }, { status: 500 });
    return NextResponse.json({ results: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
