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

    const [
      { count: students },
      { count: staff },
      { count: parents },
      { count: pendingAdmissions },
      { count: pendingPayments },
      { count: announcements },
      { count: recentLogins },
    ] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("user_category", "student"),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("user_category", "staff"),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("user_category", "parent"),
      admin.from("admissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("announcements").select("*", { count: "exact", head: true }),
      admin.from("login_audit").select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    return NextResponse.json({
      totalStudents: students || 0,
      totalStaff: staff || 0,
      totalParents: parents || 0,
      pendingAdmissions: pendingAdmissions || 0,
      pendingPayments: pendingPayments || 0,
      totalAnnouncements: announcements || 0,
      recentLogins: recentLogins || 0,
    });
  } catch (error: any) {
    console.error("[api/admin/stats] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
