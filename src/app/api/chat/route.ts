import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { chatWithJoy, streamJoy } from "@/lib/aevibron";
import { buildJoyContext } from "@/lib/joy-context";
import { executeJoyAction, getAvailableActions } from "@/lib/joy-actions";
import { searchVoraContent } from "@/lib/vora";
import { searchYouTubeAsVora } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { messages, conversationId, stream = false, attachments } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = user.id;

    // Get profile
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, user_category, role, campus_id")
      .eq("id", userId)
      .single();

    // Build context
    const enrichedContext = await buildJoyContext(userId);
    enrichedContext.availableActions = getAvailableActions(profile?.user_category || "student");

    // Fetch VORA content
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    let voraResults: any[] = [];
    try {
      voraResults = await searchVoraContent(lastUserMsg);
      if (voraResults.length === 0) {
        voraResults = await searchYouTubeAsVora(lastUserMsg);
      }
    } catch {
      voraResults = [];
    }
    enrichedContext.voraResults = voraResults;

    // Save user message to conversation
    if (conversationId) {
      await admin.from("conversation_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: lastUserMsg,
        metadata: attachments && attachments.length > 0 ? { attachments } : undefined,
      });
      await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    }

    // Build messages for AI — INCLUDE ATTACHMENTS in the last user message
    const chatMessages = messages.map((m: any) => ({ role: m.role, content: m.content }));

    // Append attachment descriptions to the last user message so the AI can see them
    if (attachments && attachments.length > 0) {
      const lastIdx = chatMessages.length - 1;
      if (lastIdx >= 0 && chatMessages[lastIdx].role === "user") {
        const attachmentDesc = attachments.map((a: any) => {
          if (a.type === "image") return `[Attached Image: ${a.name}\nURL: ${a.url}]`;
          if (a.type === "video") return `[Attached Video: ${a.name}\nURL: ${a.url}]`;
          if (a.type === "audio") return `[Attached Audio: ${a.name}\nURL: ${a.url}]`;
          if (a.type === "document") return `[Attached Document: ${a.name}\nURL: ${a.url}]`;
          if (a.type === "whiteboard") return `[Attached Whiteboard: ${a.name}\nURL: ${a.url}]`;
          if (a.type === "link") return `[Attached Link: ${a.url}]`;
          if (a.type === "poll") return `[Attached Poll: ${a.name}]`;
          return `[Attached File: ${a.name}\nURL: ${a.url}]`;
        }).join("\n\n");

        chatMessages[lastIdx].content = chatMessages[lastIdx].content
          ? `${chatMessages[lastIdx].content}\n\n${attachmentDesc}`
          : attachmentDesc;
      }
    }

    const category = categorizeQuery(lastUserMsg);

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullResponse = "";
          try {
            await streamJoy(chatMessages, (chunk) => {
              fullResponse += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
            }, enrichedContext);

            const { text, actions } = extractActions(fullResponse);

            if (actions.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ actions })}\n\n`));
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));

            if (conversationId) {
              await admin.from("conversation_messages").insert({
                conversation_id: conversationId,
                role: "assistant",
                content: text,
                metadata: actions.length > 0 ? { actions } : undefined,
              });
            }

            for (const action of actions) {
              const result = await executeJoyAction(userId, profile?.user_category || "student", action);
              await admin.from("joy_actions").insert({
                user_id: userId,
                action_type: action.type,
                action_data: action,
                success: result.success,
                error_message: result.error || null,
              });
            }

            await logAnalytics(admin, userId, profile?.user_category || "student", lastUserMsg, category, true, Date.now() - startTime, "aevibron-core-v3");
          } catch (err: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
          } finally {
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

    // Non-streaming
    const reply = await chatWithJoy(chatMessages, enrichedContext);
    const { text, actions } = extractActions(reply);

    const actionResults = [];
    for (const action of actions) {
      const result = await executeJoyAction(userId, profile?.user_category || "student", action);
      actionResults.push(result);
      await admin.from("joy_actions").insert({
        user_id: userId,
        action_type: action.type,
        action_data: action,
        success: result.success,
        error_message: result.error || null,
      });
    }

    if (conversationId) {
      await admin.from("conversation_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: text,
        metadata: { actions: actionResults },
      });
    }

    await logAnalytics(admin, userId, profile?.user_category || "student", lastUserMsg, category, true, Date.now() - startTime, "aevibron-core-v3");

    return NextResponse.json({
      reply: text,
      actions: actionResults,
      voraResults,
    });
  } catch (error: any) {
    console.error("[chat] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

function categorizeQuery(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("grade") || q.includes("mark") || q.includes("score") || q.includes("exam")) return "academic";
  if (q.includes("fee") || q.includes("payment") || q.includes("balance")) return "finance";
  if (q.includes("timetable") || q.includes("schedule") || q.includes("class")) return "schedule";
  if (q.includes("assignment") || q.includes("homework")) return "academic";
  if (q.includes("attendance") || q.includes("absent")) return "attendance";
  if (q.includes("event") || q.includes("calendar")) return "events";
  if (q.includes("pray") || q.includes("bible") || q.includes("god")) return "spiritual";
  if (q.includes("video") || q.includes("watch") || q.includes("learn")) return "learning";
  return "general";
}

function extractActions(text: string): { text: string; actions: any[] } {
  const patterns = [
    /\n?\s*\{\s*"actions"\s*:\s*\[[\s\S]*?\]\s*\}\s*$/,
    /```(?:json)?\s*\n?\s*\{\s*"actions"\s*:\s*\[[\s\S]*?\]\s*\}\s*\n?```/,
    /\{\s*"actions"\s*:\s*\[[\s\S]*?\]\s*\}/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const jsonStr = match[0].replace(/```json?\s*|```/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.actions && Array.isArray(parsed.actions)) {
          const cleanText = text.replace(match[0], "").trim();
          return { text: cleanText, actions: parsed.actions };
        }
      } catch {
        continue;
      }
    }
  }
  return { text, actions: [] };
}

async function logAnalytics(
  admin: any,
  userId: string,
  role: string,
  query: string,
  category: string,
  resolved: boolean,
  responseTimeMs: number,
  modelUsed: string
) {
  try {
    await admin.from("joy_analytics").insert({
      user_id: userId,
      query: query.slice(0, 500),
      category,
      role,
      resolved,
      response_time_ms: responseTimeMs,
      model_used: modelUsed,
    });
  } catch (err) {
    console.error("[analytics] Failed to log:", err);
  }
}
