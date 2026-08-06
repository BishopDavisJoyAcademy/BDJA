import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { chatMessageSchema } from "@/lib/validation";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";
import { searchVoraContent } from "@/lib/vora";
import { searchYouTubeAsVora } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req) + ":chat";
    const { success } = await rateLimit(identifier, { limit: 20, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validation
    const body = await req.json() as Record<string, any>;
    const parseResult = chatMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { messages, context, stream } = parseResult.data;

    // Search VORA first for relevant content
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
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

    if (!key) {
      console.error("[Joy AI] AEVIBRON_API_KEY not configured");
      return NextResponse.json({
        error: "Joy AI is temporarily unavailable. Please contact the administrator.",
        code: "CONFIG_MISSING",
      }, { status: 503 });
    }

    const payload = {
      model: context?.model || "aevibron-core-v3",
      messages,
      context: enrichedContext,
      stream: stream || false,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aevibron-Key": key,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const status = res.status;
      const errText = await res.text().catch(() => "Unknown error");
      console.error(`[Joy AI] Aevibron returned ${status}:`, errText);

      if (status === 401) {
        return NextResponse.json({ error: "Joy AI authentication failed.", code: "AUTH_FAILED" }, { status: 503 });
      }
      if (status === 429) {
        return NextResponse.json({ error: "Joy AI is busy. Please try again shortly.", code: "RATE_LIMITED" }, { status: 503 });
      }
      return NextResponse.json({ error: "Joy AI service error. Please try again.", code: "SERVICE_ERROR" }, { status: 503 });
    }

    const data = await res.json();
    return NextResponse.json({
      ...data,
      vora_results: voraResults,
      youtube_results: youtubeResults,
    });
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[Joy AI] Request timed out");
      return NextResponse.json({ error: "Joy AI is taking too long. Please try again.", code: "TIMEOUT" }, { status: 504 });
    }
    console.error("[Joy AI] Chat API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
