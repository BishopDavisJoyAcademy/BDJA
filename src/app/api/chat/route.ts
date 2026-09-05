import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";
import { joyChatMessageSchema } from "@/lib/validation";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { buildJoyContext } from "@/lib/joy-context";
import { buildSystemPrompt, getAevibronEndpoint, getAevibronKey } from "@/lib/aevibron";
import { JOY_TOOLS, executeTool, getToolsForUser, ToolExecutionContext } from "@/lib/joy-tools";
import { checkInputGuardrails, sanitizeOutput, classifyQueryIntent } from "@/lib/joy-guardrails";

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
  if (raw.endsWith("/api/v1/chat")) return raw;
  return `${raw.replace(/\/$/, "")}/api/v1/chat`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let session: { userId: string; email?: string } | null = null;

  try {
    session = await requireAuth(req);

    // Rate limiting
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

    // Get user profile for guardrails
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("user_category, full_name, campus_id")
      .eq("id", session.userId)
      .single();

    const userCategory = profile?.user_category || "student";
    const userName = profile?.full_name || "User";

    // ============================================================
    // GUARDRAILS: Check user input before sending to AI
    // ============================================================
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user") {
      const guardrailResult = await checkInputGuardrails(
        lastUserMessage.content,
        session.userId,
        userCategory
      );

      if (!guardrailResult.allowed) {
        // Log blocked query
        await logAnalytics(session.userId, conversationId, lastUserMessage.content, "blocked", 0, "guardrail", true, guardrailResult.violationType);

        return NextResponse.json({
          reply: guardrailResult.reason || "I cannot process that request. Please ask about school-related topics.",
          blocked: true,
          violationType: guardrailResult.violationType,
        });
      }
    }

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

    // Filter tools by user category
    const availableTools = getToolsForUser(userCategory);

    // Save user message to DB
    if (conversationId) {
      const userMsg = messages[messages.length - 1];
      if (userMsg && userMsg.role === "user") {
        await admin.from("conversation_messages").insert({
          conversation_id: conversationId,
          role: "user",
          content: userMsg.content,
          metadata: attachments && attachments.length > 0 ? { attachments } : undefined,
        });
      }
    }

    // Streaming response
    if (stream) {
      const encoder = new TextEncoder();
      const streamResponse = new ReadableStream({
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
                tools: availableTools.length > 0 ? availableTools : undefined,
              }),
            });

            if (!res.ok) {
              const errText = await res.text().catch(() => "Unknown error");
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errText })}\n\n`));
              controller.close();
              return;
            }

            const reader = res.body?.getReader();
            if (!reader) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "No response body" })}\n\n`));
              controller.close();
              return;
            }

            let fullContent = "";
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
                if (data === "[DONE]") continue;

                try {
                  const parsed: SseChunk = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;

                  if (delta?.content) {
                    fullContent += delta.content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: delta.content })}\n\n`));
                  }

                  if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      toolCalls.push(tc as Record<string, unknown>);
                    }
                  }
                } catch {
                  // Ignore parse errors in stream
                }
              }
            }

            // Execute any tool calls
            if (toolCalls.length > 0) {
              const toolResults = await executeToolCalls(toolCalls, session!.userId, userCategory);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ toolCalls: toolResults })}\n\n`));
            }

            // Sanitize final output
            const sanitizedContent = sanitizeOutput(fullContent);

            // Save assistant message
            if (conversationId) {
              await admin.from("conversation_messages").insert({
                conversation_id: conversationId,
                role: "assistant",
                content: sanitizedContent,
                metadata: toolCalls.length > 0 ? { toolCalls } : undefined,
              });
            }

            // Log analytics
            const responseTime = Date.now() - startTime;
            await logAnalytics(session!.userId, conversationId, lastUserMessage?.content || "", classifyQueryIntent(lastUserMessage?.content || ""), responseTime, "aevibron-core-v3", false, undefined, toolCalls.map((tc) => String((tc as { function?: { name?: string } }).function?.name || "")).filter(Boolean));

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: getErrorMessage(err) })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming response
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
        tools: availableTools.length > 0 ? availableTools : undefined,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const json: ChatResponse = await res.json();
    let replyText = json.reply || json.content || json.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that.";

    // Handle tool calls in non-streaming
    const toolCalls = json.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const toolResults = await executeToolCalls(toolCalls, session.userId, userCategory);
      // Append tool results to reply
      replyText += "\n\n[Tool Results]\n" + JSON.stringify(toolResults, null, 2);
    }

    // Sanitize output
    replyText = sanitizeOutput(replyText);

    // Save assistant message
    if (conversationId) {
      await admin.from("conversation_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: replyText,
        metadata: toolCalls && toolCalls.length > 0 ? { toolCalls } : undefined,
      });
    }

    // Log analytics
    const responseTime = Date.now() - startTime;
    await logAnalytics(session.userId, conversationId, lastUserMessage?.content || "", classifyQueryIntent(lastUserMessage?.content || ""), responseTime, "aevibron-core-v3", false, undefined, toolCalls?.map((tc) => String(tc.function?.name || "")).filter(Boolean));

    return NextResponse.json({
      reply: replyText,
      actions: json.actions,
      toolCalls: toolCalls,
    });

  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[chat] Error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ============================================================
// Helper: Execute tool calls with validation
// ============================================================
async function executeToolCalls(
  toolCalls: Array<Record<string, unknown>>,
  userId: string,
  userCategory: string
): Promise<Array<Record<string, unknown>>> {
  const results: Array<Record<string, unknown>> = [];
  const toolCtx: ToolExecutionContext = { userId, userCategory };

  for (const tc of toolCalls) {
    const toolCall = tc as {
      id: string;
      type: string;
      function: { name: string; arguments: string };
    };

    const result = await executeTool(toolCall, toolCtx);
    results.push({
      tool_call_id: result.tool_call_id,
      name: result.name,
      content: result.content,
    });
  }

  return results;
}

// ============================================================
// Helper: Log analytics
// ============================================================
async function logAnalytics(
  userId: string,
  conversationId: string | undefined,
  query: string,
  category: string,
  responseTimeMs: number,
  modelUsed: string,
  guardrailTriggered: boolean,
  guardrailReason?: string,
  toolCallsUsed?: string[]
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    await admin.from("joy_conversation_analytics").insert({
      user_id: userId,
      conversation_id: conversationId,
      query: query.slice(0, 1000),
      query_category: category,
      response_time_ms: responseTimeMs,
      model_used: modelUsed,
      guardrail_triggered: guardrailTriggered,
      guardrail_reason: guardrailReason,
      tool_calls_used: toolCallsUsed || [],
    });
  } catch (err) {
    console.error("[chat] Analytics log failed:", getErrorMessage(err));
  }
}
