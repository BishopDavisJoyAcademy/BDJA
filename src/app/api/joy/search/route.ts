import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { searchWeb, searchYouTube, summarizePage } from "@/lib/joy-search";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { query, source = "web", maxResults = 5, summarizeUrl } = body;

    if (summarizeUrl) {
      const summary = await summarizePage(String(summarizeUrl));
      return NextResponse.json({ summary });
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (source === "youtube") {
      const results = await searchYouTube(query, undefined, maxResults);
      return NextResponse.json({ results });
    }

    const results = await searchWeb(query, maxResults);
    return NextResponse.json({ results });
  } catch (error: unknown) {
    const message = error instanceof Error ? getErrorMessage(error) : "Search failed";
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: message }, { status: error.statusCode || 401 });
    }
    console.error("[joy/search] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
