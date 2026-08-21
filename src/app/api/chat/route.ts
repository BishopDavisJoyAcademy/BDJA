import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";
import { joyChatMessageSchema } from "@/lib/validation";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { buildJoyContext } from "@/lib/joy-context";
import { buildSystemPrompt, getAevibronEndpoint, getAevibronKey } from "@/lib/aevibron";
import { JOY_TOOLS, executeTool } from "@/lib/joy-tools";

export const dynamic = "force-dynamic";

interface SseChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      role?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
}

interface ChatResponse {
  reply?: string;
  content?: string;
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: Array<Record<string, unknown>>;
    };
  }>;
  actions?: Array<Record<string, unknown>>;
  toolCalls?: Array<Record<string, unknown>>;
}

function resolveEndpoint(raw: string): string {
  // If the env var already includes the full path, use it as-is.
  // Otherwise append /api/v1/chat for backward compatibility.
  if (raw.endsWith("/api/v1/chat")) return raw;
  return `${raw.replace(/\/$/, "")}/api/v1/chat`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const identifier = getClientIP(req) + ":chat";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.chat);
    if (!rateOk) {
      return NextResponse.json(
        { error: "Too many messages. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = joyChatMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, stream } = parseResult.data;
    const conversationId = body.conversationId as string | undefined;
    const attachments = body.attachments as Array<{ name: string; type: string; url?: string; extractedContent?: string }> | undefined;
    const preferences = body.preferences as { personality_mode?: string; language_preference?: string } | undefined;

    const endpoint = resolveEndpoint(getAevibronEndpoint());
    const apiKey = getAevibronKey();

    // Build rich user context
    const ctx = await buildJoyContext(session.userId);
    const systemPrompt = buildSystemPrompt({
      ...ctx,
      personality: preferences?.personality_mode || "auto",
      language: preferences?.language_preference || "auto",
    });

    // Build full messages array
    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];

    // Add attachment context if present
    if (attachments && attachments.length > 0) {
      const attachmentContext = attachments
        .map((a) => {
          if (a.extractedContent) {
            return `[Document: ${a.name}]\n${a.extractedContent.slice(0, 3000)}`;
          }
          if (a.url) {
            return `[${a.type}: ${a.name}] ${a.url}`;
          }
          return `[${a.type}: ${a.name}]`;
        })
        .join("\n\n");
      fullMessages.push({
        role: "user" as const,
        content: `Attached files context:\n\n${attachmentContext}`,
      });
    }

    // Save user message to DB
    const admin = getSupabaseAdmin();
    if (conversationId) {
      const userMsg = messages[messages.length - 1];
      if (userMsg && userMsg.role === "user") {
        await admin.from("conversation_messages").insert({
          conversation_id: conversationId,
          role: "user",
          content: userMsg.content,
        });
      }
    }

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Aevibron-Key": apiKey,
              },
              body: JSON.stringify({
                model: "aevibron-core-v3",
                messages: fullMessages,
                temperature: 0.7,
                max_tokens: 4096,
                stream: true,
                tools: JOY_TOOLS,
              }),
            });

            if (!res.ok) {
              let errMessage = `AI service error: ${res.status}`;
              try {
                const errData = await res.json() as { error?: { message?: string } | string };
                if (typeof errData.error === "string") errMessage = errData.error;
                else if (errData.error?.message) errMessage = errData.error.message;
              } catch {
                // ignore parse errors on error response
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: errMessage })}\n\n`)
              );
              controller.close();
              return;
            }

            const reader = res.body?.getReader();
            if (!reader) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: "No response body from AI service" })}\n\n`)
              );
              controller.close();
              return;
            }

            let assistantText = "";
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data) as SseChunk;
                  if (parsed.error) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ error: String(parsed.error) })}\n\n`)
                    );
                    continue;
                  }

                  const content = parsed.choices?.[0]?.delta?.content;
                  if (typeof content === "string" && content.length > 0) {
                    assistantText += content;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ chunk: content })}\n\n`)
                    );
                  }
                } catch {
                  // Ignore parse errors for malformed SSE lines
                }
              }
            }

            // Process any remaining data in buffer
            if (buffer.startsWith("data: ")) {
              const data = buffer.slice(6);
              if (data !== "[DONE]") {
                try {
                  const parsed = JSON.parse(data) as SseChunk;
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (typeof content === "string" && content.length > 0) {
                    assistantText += content;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ chunk: content })}\n\n`)
                    );
                  }
                } catch {
                  // ignore
                }
              }
            }

            // Save assistant message to DB
            if (conversationId && assistantText) {
              await admin.from("conversation_messages").insert({
                conversation_id: conversationId,
                role: "assistant",
                content: assistantText,
              });
            }

            controller.close();
          } catch (err) {
            const message = err instanceof Error ? err.message : "Streaming failed";
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming path
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aevibron-Key": apiKey,
      },
      body: JSON.stringify({
        model: "aevibron-core-v3",
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: false,
        tools: JOY_TOOLS,
      }),
    });

    if (!res.ok) {
      let errMessage = `AI service error: ${res.status}`;
      try {
        const errData = await res.json() as { error?: { message?: string } | string };
        if (typeof errData.error === "string") errMessage = errData.error;
        else if (errData.error?.message) errMessage = errData.error.message;
      } catch {
        // ignore
      }
      return NextResponse.json({ error: errMessage }, { status: res.status });
    }

    const data = (await res.json()) as ChatResponse;
    let replyText = data.reply ?? data.content ?? data.choices?.[0]?.message?.content ?? "";
    const actions = Array.isArray(data.actions) ? data.actions : [];

    // Handle tool calls from either top-level or choices[0].message
    const rawToolCalls = data.toolCalls ?? data.choices?.[0]?.message?.tool_calls;
    if (Array.isArray(rawToolCalls) && rawToolCalls.length > 0) {
      const toolResults = [];
      for (const tc of rawToolCalls) {
        const result = await executeTool(tc as { id: string; type: "function"; function: { name: string; arguments: string } });
        toolResults.push(result);
      }

      const toolMessages = toolResults.map((tr) => ({
        role: "tool" as const,
        content: tr.content,
        tool_call_id: tr.tool_call_id,
      }));

      const finalRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aevibron-Key": apiKey,
        },
        body: JSON.stringify({
          model: "aevibron-core-v3",
          messages: [
            ...fullMessages,
            { role: "assistant", content: replyText },
            ...toolMessages,
          ],
          temperature: 0.7,
          max_tokens: 4096,
          stream: false,
        }),
      });

      if (finalRes.ok) {
        const finalData = (await finalRes.json()) as ChatResponse;
        replyText = finalData.reply ?? finalData.content ?? finalData.choices?.[0]?.message?.content ?? replyText;
      }
    }

    // Save assistant message to DB
    if (conversationId && replyText) {
      await admin.from("conversation_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: replyText,
      });
    }

    return NextResponse.json({ reply: replyText, actions });
  } catch (error: unknown) {
    const message = error instanceof Error ? getErrorMessage(error) : "Chat request failed";
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: message }, { status: error.statusCode || 401 });
    }
    console.error("[chat] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
