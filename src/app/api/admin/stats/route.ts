import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "analytics.view")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
  } catch (error: any) {
    console.error("[api/admin/stats] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
