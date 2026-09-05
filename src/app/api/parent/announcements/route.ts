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
    const category = searchParams.get("category");

    const admin = getSupabaseAdmin();

    let query = admin
      .from("announcements")
      .select(`
        *,
        profiles:created_by(full_name, avatar_url),
        classes:target_class_id(name, grade_level)
      `)
      .or(`target_audience.eq.all,target_audience.eq.parents`)
      .lte("published_at", new Date().toISOString())
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false });

    if (category) query = query.eq("category", category);

    // Handle expires_at filter separately to avoid type issues
    const { data: rawData, error } = await query;

    if (error) {
      console.error("[api/parent/announcements] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
    }

    // Filter out expired announcements in JS
    const now = new Date().toISOString();
    let data = (rawData || []).filter((a: Record<string, unknown>) => {
      const expires = a.expires_at as string | null;
      return !expires || expires > now;
    });

    // If child_id provided, also include class-specific announcements
    if (childId) {
      // Verify access
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

      if (authorized) {
        const { data: studentRow } = await admin
          .from("students")
          .select("class_id, grade_level")
          .eq("id", childId)
          .maybeSingle();

        if (studentRow?.class_id) {
          const { data: classAnnouncements } = await admin
            .from("announcements")
            .select(`
              *,
              profiles:created_by(full_name, avatar_url),
              classes:target_class_id(name, grade_level)
            `)
            .eq("target_class_id", studentRow.class_id)
            .or(`target_grade_level.eq.${studentRow.grade_level}`)
            .lte("published_at", now)
            .order("is_pinned", { ascending: false })
            .order("published_at", { ascending: false });

          const filteredClass = (classAnnouncements || []).filter((a: Record<string, unknown>) => {
            const expires = a.expires_at as string | null;
            return !expires || expires > now;
          });

          // Merge and deduplicate
          const existingIds = new Set(data.map((a: Record<string, unknown>) => a.id as string));
          filteredClass.forEach((a: Record<string, unknown>) => {
            if (!existingIds.has(a.id as string)) data.push(a);
          });

          // Re-sort
          data.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            if (a.is_pinned !== b.is_pinned) return (b.is_pinned as boolean) ? 1 : -1;
            return new Date(b.published_at as string).getTime() - new Date(a.published_at as string).getTime();
          });
        }
      }
    }

    // Check read status
    const announcementIds = data.map((a: Record<string, unknown>) => a.id as string);
    let readSet = new Set<string>();
    if (announcementIds.length > 0) {
      const { data: reads } = await admin
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", session.userId)
        .in("announcement_id", announcementIds);
      (reads || []).forEach((r: Record<string, unknown>) => readSet.add(r.announcement_id as string));
    }

    const enriched = data.map((a: Record<string, unknown>) => ({
      ...a,
      is_read: readSet.has(a.id as string),
    }));

    return NextResponse.json({ announcements: enriched });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/announcements] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
