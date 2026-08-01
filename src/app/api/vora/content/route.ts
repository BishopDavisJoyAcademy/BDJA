import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { loadAllVoraContent, getVoraByGrade, getVoraSubjects, getVoraCategories } from "@/lib/vora";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req) + ":vora-content";
    const { success } = await rateLimit(identifier, { limit: 60, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");
    const category = searchParams.get("category");
    const mode = searchParams.get("mode"); // 'subjects', 'categories', 'all'

    if (mode === "subjects") {
      return NextResponse.json({ subjects: getVoraSubjects() });
    }

    if (mode === "categories") {
      return NextResponse.json({ categories: getVoraCategories() });
    }

    let content = grade ? getVoraByGrade(grade) : loadAllVoraContent();

    if (subject) {
      content = content.filter(c => c.subject?.toLowerCase() === subject.toLowerCase());
    }
    if (category) {
      content = content.filter(c => c.category?.toLowerCase() === category.toLowerCase());
    }

    return NextResponse.json({ content, count: content.length });
  } catch (error: any) {
    console.error("VORA content error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
