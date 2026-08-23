import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAnyPermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireAnyPermission(session, ["analytics.view", "admin.access"]);

    const admin = getSupabaseAdmin();
    const [studentsCount, staffCount, parentsCount, admissionsCount] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("user_category", "student"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("user_category", "staff"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("user_category", "parent"),
      admin.from("admissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    return NextResponse.json({
      students: studentsCount.count || 0,
      staff: staffCount.count || 0,
      parents: parentsCount.count || 0,
      pendingAdmissions: admissionsCount.count || 0,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[stats] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
