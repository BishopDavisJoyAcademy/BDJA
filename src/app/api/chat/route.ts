import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { chatMessageSchema } from "@/lib/validation";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";
import { searchVoraContent } from "@/lib/vora";
import { searchYouTubeAsVora } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req) + ":chat";
    const { success } = await rateLimit(identifier, { limit: 20, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Auth check
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validation
    const body = await req.json();
    const parseResult = chatMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { messages, context, stream } = parseResult.data;

    // Search VORA first for relevant content
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    const voraResults = searchVoraContent(lastUserMessage, {
      grade_level: context?.grade_level,
      subject: context?.subject,
      limit: 5,
    });

    // If no local results, search YouTube as fallback
    let youtubeResults: any[] = [];
    if (voraResults.length === 0 && lastUserMessage.length > 3) {
      youtubeResults = await searchYouTubeAsVora(lastUserMessage, context?.grade_level, 3);
    }

    const enrichedContext = {
      ...context,
      voraResults: voraResults.length > 0 ? voraResults : youtubeResults,
      hasLocalContent: voraResults.length > 0,
    };

    // Proxy to Aevibron
    const endpoint = process.env.NEXT_PUBLIC_AEVIBRON_ENDPOINT || "https://api.aevibron.com/api/v1/chat";
    const key = process.env.AEVIBRON_API_KEY || "";

    const payload = {
      model: context?.model || "aevibron-core-v3",
      messages,
      context: enrichedContext,
      stream: stream || false,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aevibron-Key": key,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Aevibron error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      ...data,
      vora_results: voraResults,
      youtube_results: youtubeResults,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
