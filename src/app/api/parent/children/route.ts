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

    const admin = getSupabaseAdmin();

    // Get linked children
    const { data: links, error: linkError } = await admin
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", session.userId);

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ children: [] });
    }

    const studentIds = links.map((l: { student_id: string }) => l.student_id);

    const { data: children, error: childError } = await admin
      .from("profiles")
      .select("*, students(*)")
      .in("id", studentIds)
      .eq("is_active", true);

    if (childError) {
      return NextResponse.json({ error: childError.message }, { status: 500 });
    }

    return NextResponse.json({ children: children || [] });
  } catch (error: any) {
    console.error("[api/parent/children] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
