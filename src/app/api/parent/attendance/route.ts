import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("child_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!childId) {
      return NextResponse.json({ error: "child_id is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify parent access
    const { data: authCheck } = await admin
      .from("parent_children")
      .select("id")
      .eq("parent_id", session.userId)
      .eq("student_id", childId)
      .limit(1);

    let authorized = (authCheck && authCheck.length > 0);
    if (!authorized) {
      const { data: legacyCheck } = await admin
        .from("parent_students")
        .select("id")
        .eq("parent_id", session.userId)
        .eq("student_id", childId)
        .limit(1);
      authorized = (legacyCheck && legacyCheck.length > 0);
    }

    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let query = admin
      .from("attendance")
      .select(`
        *,
        subjects:subject_id(name),
        classes:class_id(name),
        profiles:marked_by(full_name)
      `)
      .eq("student_id", childId);

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("[api/parent/attendance] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
    }

    // Calculate stats
    const stats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    (data || []).forEach((r: Record<string, unknown>) => {
      const status = (r.status as string)?.toLowerCase();
      if (status in stats) stats[status as keyof typeof stats]++;
      stats.total++;
    });

    return NextResponse.json({ attendance: data || [], stats });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/attendance] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
