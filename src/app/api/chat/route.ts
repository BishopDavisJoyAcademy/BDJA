import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";
import { chatMessageSchema } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

const AEVIBRON_URL = process.env.AEVIBRON_GATEWAY_URL || "https://gateway.aevibron.com";
const AEVIBRON_KEY = process.env.AEVIBRON_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const identifier = getClientIP(req) + ":chat";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.chat);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const parseResult = chatMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { messages, context, stream } = parseResult.data;

    if (!AEVIBRON_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // Build system prompt with school context
    const systemPrompt = `You are Joy, the AI learning assistant for Bishop Davis Joy Academy. You are helpful, friendly, and knowledgeable about CBC education in Kenya. You assist students, parents, and staff with academic questions, school information, and general learning support. Be concise and accurate. If you don't know something, say so.`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const res = await fetch(`${AEVIBRON_URL}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aevibron-Key": AEVIBRON_KEY,
      },
      body: JSON.stringify({
        model: "aevibron-core-v3",
        messages: fullMessages,
        stream: stream || false,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "AI service error", details: errText }, { status: 502 });
    }

    if (stream) {
      return new Response(res.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";

    return NextResponse.json({
      success: true,
      message: content,
      model: data.model,
    });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: (error instanceof Error ? getErrorMessage(error) : "Chat request failed") }, { status: error.statusCode || 401 });
    }
    console.error("[chat] Error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
