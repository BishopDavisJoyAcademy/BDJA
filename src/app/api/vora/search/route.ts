import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { searchYouTubeAsVora } from "@/lib/youtube";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface VoraContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  grade_level: string | null;
  subject: string | null;
  category: string;
  duration_seconds: number | null;
  is_published: boolean;
  created_at: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const grade_level = searchParams.get("grade_level");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 20);

    if (!query) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    let dbQuery = admin.from("vora_content").select("*").eq("is_published", true);
    if (grade_level) dbQuery = dbQuery.eq("grade_level", grade_level);

    const { data: dbResults, error } = await dbQuery
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit);

    if (error) return NextResponse.json({ error: "Search failed" }, { status: 500 });

    let youtubeResults: VoraContent[] = [];
    try {
      youtubeResults = (await searchYouTubeAsVora(query, grade_level, Math.min(limit, 5))) as VoraContent[];
    } catch {
      // YouTube search is optional
    }

    const combined = [...(dbResults || []), ...youtubeResults];
    return NextResponse.json({ results: combined });
  } catch (error: unknown) {
    console.error("[vora/search] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
