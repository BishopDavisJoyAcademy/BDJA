import { JoyMessage } from "@/types";

const AEVIBRON_ENDPOINT = process.env.NEXT_PUBLIC_AEVIBRON_ENDPOINT || "https://api.aevibron.com/api/v1/chat";
const AEVIBRON_KEY = process.env.AEVIBRON_API_KEY || "";

export interface AevibronContext {
  userName?: string;
  userCategory?: string;
  gradeLevel?: string;
  designation?: string;
  campusId?: string;
  timetable?: any[];
  grades?: any[];
  assignments?: any[];
  fees?: any[];
  attendance?: any[];
  calendarEvents?: any[];
  voraResults?: any[];
  children?: any[];
  availableActions?: string[];
  personality?: string;
  language?: string;
}

function buildSystemPrompt(ctx?: AevibronContext): string {
  const personality = ctx?.personality || "auto";
  const lang = ctx?.language || "auto";

  let prompt = `You are Joy, the AI assistant for Bishop Davis Joy Academy (BDJA).

IDENTITY RULES (MANDATORY):
- You MUST always identify yourself as "Joy" and ONLY "Joy".
- NEVER mention Aevibron, Groq, Gemini, OpenAI, or any other AI provider.
- NEVER say "I am an AI" or "I am a language model". Say "I am Joy".
- If someone asks who made you, say "I was built for Bishop Davis Joy Academy."

CORE VALUES:
Prayer, Integrity, Discipline, Commitment, Respect, Excellence, Responsibility, Teamwork, Compassion.

TONE & STYLE:
`;

  if (personality === "playful" || (personality === "auto" && ctx?.userCategory === "student" && ctx?.gradeLevel?.match(/playgroup|pp1|pp2|grade1|grade2/))) {
    prompt += `- Playful, warm, and encouraging. Use emojis naturally. Keep sentences short and simple.
- Celebrate small wins. Be patient with mistakes. Make learning feel like an adventure.`;
  } else if (personality === "study_buddy" || (personality === "auto" && ctx?.userCategory === "student")) {
    prompt += `- Friendly and smart. Like a helpful older sibling or tutor.
- Ask follow-up questions to check understanding. Give step-by-step explanations.
- Use examples relevant to the student's grade level.`;
  } else if (personality === "professional" || (personality === "auto" && ctx?.userCategory === "parent")) {
    prompt += `- Warm, clear, and reassuring. Use complete sentences.
- Provide specific details when available. Be respectful of parents' concerns.`;
  } else if (personality === "efficient" || (personality === "auto" && ctx?.userCategory === "staff")) {
    prompt += `- Direct, helpful, and data-rich. Get to the point quickly.
- Offer actionable next steps. Suggest shortcuts and templates when relevant.`;
  } else {
    prompt += `- Warm, encouraging, and professional. Adapt to the user's needs.
- Be respectful, never condescending. Align with BDJA motto: "Prayer, Commitment and Hard Work for Success."`;
  }

  prompt += `

LANGUAGE:
- Default to English. If the user writes in Kiswahili, respond in Kiswahili.
- ${lang === "kiswahili" ? "Prefer Kiswahili responses when appropriate." : "Match the user's language preference."}`;

  if (ctx?.userName) {
    prompt += `

USER: You are speaking with ${ctx.userName}.`;
  }
  if (ctx?.userCategory) {
    prompt += `
ROLE: ${ctx.userCategory}`;
  }
  if (ctx?.gradeLevel) {
    prompt += `
GRADE LEVEL: ${ctx.gradeLevel}. Tailor all explanations to this level.`;
  }
  if (ctx?.designation) {
    prompt += `
DESIGNATION: ${ctx.designation}`;
  }

  // Context injection
  if (ctx?.timetable && ctx.timetable.length > 0) {
    prompt += `

TIMETABLE DATA:
`;
    ctx.timetable.slice(0, 5).forEach((t: any, i: number) => {
      prompt += `${i + 1}. ${t.subjects?.name || t.subject || "Subject"} - ${t.day_of_week !== undefined ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][t.day_of_week] : ""} ${t.start_time || ""}-${t.end_time || ""}${t.room ? ` (Room ${t.room})` : ""}
`;
    });
  }

  if (ctx?.assignments && ctx.assignments.length > 0) {
    prompt += `
PENDING ASSIGNMENTS:
`;
    ctx.assignments.slice(0, 5).forEach((a: any, i: number) => {
      prompt += `${i + 1}. ${a.title} (${a.subjects?.name || a.subject || "Subject"})${a.due_date ? ` - Due: ${a.due_date}` : ""}
`;
    });
  }

  if (ctx?.grades && ctx.grades.length > 0) {
    prompt += `
RECENT GRADES:
`;
    ctx.grades.slice(0, 5).forEach((g: any, i: number) => {
      prompt += `${i + 1}. ${g.subjects?.name || g.subject || "Subject"}: ${g.performance_level || g.score || "N/A"}
`;
    });
  }

  if (ctx?.fees && ctx.fees.length > 0) {
    prompt += `
FEE INFORMATION:
`;
    ctx.fees.slice(0, 3).forEach((f: any, i: number) => {
      prompt += `${i + 1}. ${f.term || ""} ${f.academic_year || ""}: ${f.status || "N/A"} (Balance: ${f.balance || 0})
`;
    });
  }

  if (ctx?.calendarEvents && ctx.calendarEvents.length > 0) {
    prompt += `
UPCOMING EVENTS:
`;
    ctx.calendarEvents.slice(0, 5).forEach((e: any, i: number) => {
      prompt += `${i + 1}. ${e.title} - ${e.start_date ? new Date(e.start_date).toLocaleDateString() : "TBD"}
`;
    });
  }

  if (ctx?.voraResults && ctx.voraResults.length > 0) {
    prompt += `
LOCAL VORA CONTENT:
`;
    ctx.voraResults.forEach((v: any, i: number) => {
      prompt += `${i + 1}. ${v.title} (${v.subject}, ${v.grade_level}) - ${v.summary?.substring(0, 80) || "No summary"}
`;
    });
    prompt += `
When relevant, recommend these videos and explain how they connect to the user's question.`;
  }

  if (ctx?.children && ctx.children.length > 0) {
    prompt += `

CHILDREN:
`;
    ctx.children.forEach((c: any, i: number) => {
      prompt += `${i + 1}. ${c.students?.admission_number || "Child"} - Grade: ${c.students?.classes?.name || c.students?.grade_level || "N/A"}
`;
    });
  }

  // Action capabilities
  if (ctx?.availableActions && ctx.availableActions.length > 0) {
    prompt += `

ACTIONS YOU CAN TRIGGER (include in JSON format at the END of your response ONLY when the user explicitly asks you to do something):
`;
    ctx.availableActions.forEach((a: string) => {
      prompt += `- ${a}: ${getActionDescription(a)}
`;
    });
    prompt += `
To trigger an action, add this EXACT JSON block at the very end of your message (after a blank line):
{"actions":[{"type":"ACTION_TYPE","target":"...","payload":{...}}]}
Only include this when the user explicitly asks you to create, update, delete, or navigate.`;
  }

  return prompt;
}

function getActionDescription(action: string): string {
  const map: Record<string, string> = {
    navigate: "Redirect the user to a specific page",
    refresh: "Refresh data on the current page",
    create_record: "Create a new database record (timetable, assignment, etc.)",
    update_record: "Update an existing database record",
    delete_record: "Delete a database record",
    notify: "Send a notification to a user",
    open_modal: "Open a modal dialog",
    export: "Export data to PDF or text",
  };
  return map[action] || action;
}

export async function chatWithJoy(
  messages: JoyMessage[],
  context?: AevibronContext
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const systemPrompt = buildSystemPrompt(context);
    const payload = {
      model: context?.personality === "playful" ? "aevibron-core-v3" : "aevibron-core-v3",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: false,
    };

    const res = await fetch(AEVIBRON_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aevibron-Key": AEVIBRON_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Aevibron error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error: any) {
    if (error.name === "AbortError") {
      return "The request timed out. Please try again with a shorter message.";
    }
    console.error("Joy AI Error:", error);
    return "I'm having trouble connecting right now. Please check your connection and try again.";
  }
}

export async function streamJoy(
  messages: JoyMessage[],
  onChunk: (chunk: string) => void,
  context?: AevibronContext
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const systemPrompt = buildSystemPrompt(context);
    const payload = {
      model: "aevibron-core-v3",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: true,
    };

    const res = await fetch(AEVIBRON_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aevibron-Key": AEVIBRON_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Failed to stream from Aevibron (${res.status})`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch {
            // Ignore malformed JSON chunks
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      onChunk("\n\n[Connection timed out. Please try again.]");
      return;
    }
    throw error;
  }
}
