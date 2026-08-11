import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

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

    const { data, error } = await admin
      .from("saved_videos")
      .select("*, vora_content(*)")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    if (error) {
      console.error("[saved-videos GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch saved videos" }, { status: 500 });
    }

    return NextResponse.json({ videos: data || [] });
  } catch (error: unknown) {
    console.error("[saved-videos GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { video_id } = body;

    if (!video_id) {
      return NextResponse.json({ error: "video_id required" }, { status: 400 });
    }

    // Fetch video details from vora_content to populate required fields
    const { data: video, error: videoErr } = await admin
      .from("vora_content")
      .select("id, title, video_url, thumbnail_url, subject, grade_level, duration, summary")
      .eq("id", video_id)
      .maybeSingle();

    if (videoErr) {
      console.error("[saved-videos POST] video fetch error:", videoErr);
      return NextResponse.json({ error: "Failed to fetch video details" }, { status: 500 });
    }

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const { error } = await admin.from("saved_videos").insert({
      user_id: user.id,
      video_id: video_id,
      title: video.title,
      youtube_url: video.video_url,
      thumbnail_url: video.thumbnail_url,
      subject: video.subject,
      grade_level: video.grade_level,
      duration_seconds: video.duration ? parseInt(video.duration, 10) || null : null,
      summary: video.summary,
    });

    if (error) {
      console.error("[saved-videos POST] insert error:", error);
      return NextResponse.json({ error: "Failed to save video" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[saved-videos POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
