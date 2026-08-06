import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("child");

    if (!childId) {
      return NextResponse.json({ error: "Child ID required" }, { status: 400 });
    }

    // Verify this child belongs to the parent
    const admin = getSupabaseAdmin();
    const { data: link } = await admin
      .from("parent_students")
      .select("id")
      .eq("parent_id", session.userId)
      .eq("student_id", childId)
      .single();

    if (!link) {
      return NextResponse.json({ error: "Not authorized to view this student" }, { status: 403 });
    }

    const { data: child } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", childId)
      .single();

    const { data: grades, error: gradeError } = await admin
      .from("grades")
      .select("*, subjects(name)")
      .eq("student_id", childId)
      .order("created_at", { ascending: false });

    if (gradeError) {
      return NextResponse.json({ error: gradeError.message }, { status: 500 });
    }

    return NextResponse.json({
      grades: grades || [],
      child_name: child?.full_name || "",
    });
  } catch (error: any) {
    console.error("[api/parent/grades] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
