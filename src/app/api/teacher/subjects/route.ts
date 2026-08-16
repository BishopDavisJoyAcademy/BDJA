import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface SubjectRecord {
  id: string;
  name: string;
  code: string | null;
  grade_level: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");

    if (!teacherId) {
      const { data, error } = await admin.from("subjects").select("*").order("name", { ascending: true });
      if (error) return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
      return NextResponse.json({ subjects: data || [] });
    }

    const { data: allSubjects } = await admin
      .from("teacher_timetables")
      .select("subjects(id, name, code, grade_level)")
      .eq("teacher_id", teacherId);

    const subjects: SubjectRecord[] = [];
    const seen = new Set<string>();
    for (const row of (allSubjects || [])) {
      const subject = (row as { subjects: SubjectRecord | null }).subjects;
      if (subject && subject.id && !seen.has(subject.id)) {
        seen.add(subject.id);
        subjects.push(subject);
      }
    }

    return NextResponse.json({ subjects });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
