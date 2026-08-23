import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    interface ContinueRow {
      video_id: string;
      title: string;
      thumbnail_url: string | null;
      subject: string | null;
      grade_level: string | null;
      duration_seconds: number | null;
      saved_at: string | null;
    }

    const { data: rows, error } = await admin
      .from("saved_videos")
      .select("video_id, title, thumbnail_url, subject, grade_level, duration_seconds, saved_at")
      .eq("user_id", session.userId)
      .order("saved_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[vora/continue] Error:", error);
      return NextResponse.json({ error: "Failed to fetch continue watching" }, { status: 500 });
    }

    interface SavedVideoRow {
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  subject: string | null;
  grade_level: string | null;
  duration_seconds: number | null;
  saved_at: string;
}

    const items = (rows || []).map((r: SavedVideoRow) => ({
      id: r.video_id,
      title: r.title,
      thumbnail_url: r.thumbnail_url,
      subject: r.subject,
      grade_level: r.grade_level,
      duration_seconds: r.duration_seconds,
      last_watched_at: r.saved_at,
    }));

    return NextResponse.json({ items });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[vora/continue] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
