import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "admin.access");

    const admin = getSupabaseAdmin();

    const [
      { count: adminCount },
      { count: campusCount },
      { count: subjectCount },
      { count: staffCount },
      { count: studentCount },
      { count: cmsPageCount },
      { count: voraCount },
      { data: settings },
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("user_category", "admin"),
      admin.from("campuses").select("id", { count: "exact", head: true }),
      admin.from("subjects").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("user_category", "staff"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("user_category", "student"),
      admin.from("cms_pages").select("id", { count: "exact", head: true }),
      admin.from("vora_content").select("id", { count: "exact", head: true }),
      admin.from("platform_settings").select("id").limit(1),
    ]);

    return NextResponse.json({
      hasSuperAdmin: (adminCount || 0) > 0,
      campusCount: campusCount || 0,
      subjectCount: subjectCount || 0,
      staffCount: staffCount || 0,
      studentCount: studentCount || 0,
      cmsPageCount: cmsPageCount || 0,
      voraCount: voraCount || 0,
      hasSettings: (settings || []).length > 0,
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
