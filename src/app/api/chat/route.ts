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

    const { messages, conversationId, stream, attachments } = parseResult.data;
    const preferences = body.preferences as { personality_mode?: string; language_preference?: string } | undefined;

    const endpoint = getAevibronEndpoint();
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
            const res = await fetch(`${endpoint}/api/v1/chat`, {
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
              const errData = await res.json().catch(() => ({}));
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: errData.error || `AI service error: ${res.status}` })}\n\n`)
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
            let toolCalls: Array<Record<string, unknown>> = [];
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  continue;
                }
                try {
                  const parsed = JSON.parse(data) as Record<string, unknown>;
                  if (parsed.error) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ error: String(parsed.error) })}\n\n`)
                    );
                    continue;
                  }
                  if (typeof parsed.chunk === "string") {
                    assistantText += parsed.chunk;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: parsed.chunk })}\n\n`));
                  }
                  if (Array.isArray(parsed.toolCalls)) {
                    toolCalls = parsed.toolCalls as Array<Record<string, unknown>>;
                  }
                } catch {
                  // Ignore parse errors for malformed SSE lines
                }
              }
            }

            // Execute tools if any
            if (toolCalls.length > 0) {
              const toolResults = [];
              for (const tc of toolCalls) {
                const result = await executeTool(tc as { id: string; type: "function"; function: { name: string; arguments: string } });
                toolResults.push(result);
              }
              // Send tool results back to gateway for final response
              const toolMessages = toolResults.map((tr) => ({
                role: "tool" as const,
                content: tr.content,
                tool_call_id: tr.tool_call_id,
              }));

              const finalRes = await fetch(`${endpoint}/api/v1/chat`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Aevibron-Key": apiKey,
                },
                body: JSON.stringify({
                  model: "aevibron-core-v3",
                  messages: [
                    ...fullMessages,
                    { role: "assistant", content: assistantText },
                    ...toolMessages,
                  ],
                  temperature: 0.7,
                  max_tokens: 4096,
                  stream: true,
                }),
              });

              if (finalRes.ok && finalRes.body) {
                const finalReader = finalRes.body.getReader();
                while (true) {
                  const { done, value } = await finalReader.read();
                  if (done) break;
                  const chunk = decoder.decode(value);
                  const lines = chunk.split("\n");
                  for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") {
                      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                      continue;
                    }
                    try {
                      const parsed = JSON.parse(data) as Record<string, unknown>;
                      if (typeof parsed.chunk === "string") {
                        assistantText += parsed.chunk;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: parsed.chunk })}\n\n`));
                      }
                    } catch {
                      // ignore
                    }
                  }
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
    const res = await fetch(`${endpoint}/api/v1/chat`, {
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
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `AI service error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json() as Record<string, unknown>;
    let replyText = "";
    if (typeof data.reply === "string") replyText = data.reply;
    else if (typeof data.content === "string") replyText = data.content;
    else if (Array.isArray(data.choices) && data.choices[0] && typeof (data.choices[0] as Record<string, unknown>).message === "object") {
      const msg = (data.choices[0] as Record<string, unknown>).message as Record<string, unknown>;
      if (typeof msg.content === "string") replyText = msg.content;
    }

    let actions: Array<Record<string, unknown>> = [];
    if (Array.isArray(data.actions)) actions = data.actions as Array<Record<string, unknown>>;

    // Handle tool calls in non-streaming
    const rawToolCalls = data.toolCalls;
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

      const finalRes = await fetch(`${endpoint}/api/v1/chat`, {
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
        const finalData = await finalRes.json() as Record<string, unknown>;
        if (typeof finalData.reply === "string") replyText = finalData.reply;
        else if (typeof finalData.content === "string") replyText = finalData.content;
        else if (Array.isArray(finalData.choices) && finalData.choices[0]) {
          const msg = (finalData.choices[0] as Record<string, unknown>).message as Record<string, unknown>;
          if (typeof msg.content === "string") replyText = msg.content;
        }
        if (Array.isArray(finalData.actions)) actions = finalData.actions as Array<Record<string, unknown>>;
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
