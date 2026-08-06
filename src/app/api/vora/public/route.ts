import { NextRequest, NextResponse } from "next/server";
import { loadAllVoraContent, extractYouTubeId, getYouTubeThumbnail } from "@/lib/vora";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req) + ":vora-public";
    const { success } = await rateLimit(identifier, { limit: 30, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

    const all = loadAllVoraContent();
    // Shuffle and pick a diverse sample
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const preview = shuffled.slice(0, limit).map(item => ({
      id: item.id,
      title: item.title,
      subject: item.subject,
      category: item.category,
      topic: item.topic,
      thumbnail_url: item.thumbnail_url || getYouTubeThumbnail(extractYouTubeId(item.youtube_url || "") || ""),
      youtube_url: item.youtube_url,
      duration_seconds: item.duration_seconds,
      channel: item.channel,
      grade_level: item.grade_level,
    }));

    return NextResponse.json({ content: preview, count: preview.length });
  } catch (error: any) {
    console.error("VORA public error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
