import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { voraSearchSchema } from "@/lib/validation";
import { searchVoraContent, loadAllVoraContent } from "@/lib/vora";
import { searchYouTubeAsVora } from "@/lib/youtube";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req) + ":vora-search";
    const { success } = await rateLimit(identifier, { limit: 30, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Auth check — v0.12.4: use async createClient with getAll/setAll
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const grade_level = searchParams.get("grade_level") || undefined;
    const subject = searchParams.get("subject") || undefined;
    const category = searchParams.get("category") || undefined;
    const includeYoutube = searchParams.get("include_youtube") === "true";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const parseResult = voraSearchSchema.safeParse({
      query,
      grade_level: grade_level as any,
      subject: subject || undefined,
      category: category || undefined,
      limit,
    });

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    // Search local VORA first
    const localResults = searchVoraContent(query, {
      grade_level: parseResult.data.grade_level,
      subject: parseResult.data.subject,
      category: parseResult.data.category,
      limit: parseResult.data.limit,
    });

    let youtubeResults: any[] = [];
    if (includeYoutube && localResults.length < 3 && query.length > 2) {
      youtubeResults = await searchYouTubeAsVora(query, grade_level, 5 - localResults.length);
    }

    return NextResponse.json({
      local: localResults,
      youtube: youtubeResults,
      total: localResults.length + youtubeResults.length,
    });
  } catch (error: any) {
    console.error("VORA search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
