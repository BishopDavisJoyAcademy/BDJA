import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { video_id, title, thumbnail_url, subject, grade_level, duration_seconds, youtube_url, action, watch_duration } = body;

    if (!video_id || !title) {
      return NextResponse.json({ error: "Video ID and title required" }, { status: 400 });
    }

    // Delete existing record to avoid duplicates (no unique constraint on user_id+video_id)
    await admin.from("saved_videos").delete().eq("user_id", session.userId).eq("video_id", video_id);

    // Insert new record
    const { error } = await admin.from("saved_videos").insert({
      user_id: session.userId,
      video_id,
      title,
      thumbnail_url: thumbnail_url || null,
      subject: subject || null,
      grade_level: grade_level || null,
      duration_seconds: duration_seconds || null,
      youtube_url: youtube_url || "",
      saved_at: new Date().toISOString(),
      difficulty: action === "save" ? "saved" : (watch_duration && watch_duration > 30 ? "watched" : "started"),
    });

    if (error) {
      console.error("[vora/engage] Error:", error);
      return NextResponse.json({ error: "Failed to record engagement" }, { status: 500 });
    }

    return NextResponse.json({ success: true, action, watch_duration });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[vora/engage] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
