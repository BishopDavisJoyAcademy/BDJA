import { NextRequest, NextResponse } from "next/server";
import { searchVoraContent } from "@/lib/vora";
import { searchYouTubeAsVora } from "@/lib/youtube";
import { voraSearchSchema } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const grade_level = searchParams.get("grade_level") || undefined;
    const subject = searchParams.get("subject") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "10");

    const parseResult = voraSearchSchema.safeParse({
      query,
      grade_level,
      subject,
      category,
      limit,
    });

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const localResults = searchVoraContent(query, { grade_level, subject, limit });

    let youtubeResults: Record<string, unknown>[] = [];
    if (localResults.length === 0 && query.length > 3) {
      youtubeResults = await searchYouTubeAsVora(query, grade_level, Math.min(limit, 5));
    }

    return NextResponse.json({
      local: localResults,
      youtube: youtubeResults,
      total: localResults.length + youtubeResults.length,
    });
  } catch (error: unknown) {
    console.error("[api/vora/search] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
