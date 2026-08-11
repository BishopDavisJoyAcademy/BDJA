import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");

    if (!classId) {
      return NextResponse.json({ error: "class_id is required" }, { status: 400 });
    }

    // Get subjects for this class that this teacher teaches
    const { data, error } = await admin
      .from("class_subjects")
      .select("id, class_id, teacher_id, subjects(id, name, code)")
      .eq("class_id", classId)
      .eq("teacher_id", session.userId);

    if (error) {
      console.error("[teacher/subjects GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
    }

    // Also include subjects where user is admin (can see all)
    let allSubjects = data || [];
    if (session.userCategory === "admin" || session.role === "admin") {
      const { data: adminSubjects, error: adminErr } = await admin
        .from("class_subjects")
        .select("id, class_id, teacher_id, subjects(id, name, code)")
        .eq("class_id", classId);
      if (!adminErr && adminSubjects) {
        const seen = new Set(allSubjects.map((s: any) => s.subjects?.id));
        for (const s of adminSubjects) {
          if (s.subjects && !seen.has(s.subjects.id)) {
            allSubjects.push(s);
            seen.add(s.subjects.id);
          }
        }
      }
    }

    const subjects = allSubjects
      .map((item: any) => item.subjects)
      .filter(Boolean)
      .filter((s: any, i: number, arr: any[]) => arr.findIndex((x) => x.id === s.id) === i);

    return NextResponse.json({ subjects });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[teacher/subjects GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
