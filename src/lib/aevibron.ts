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
GRADE LEVEL: ${ctx.gradeLevel}`;
  }

  if (ctx?.designation) {
    prompt += `
DESIGNATION: ${ctx.designation}`;
  }

  if (ctx?.timetable && ctx.timetable.length > 0) {
    prompt += `

TIMETABLE (next few classes):
${ctx.timetable.slice(0, 5).map((t: any) => `- ${t.day_of_week}: ${t.subjects?.name || t.subject} (${t.start_time}-${t.end_time})`).join("\n")}`;
  }

  if (ctx?.grades && ctx.grades.length > 0) {
    prompt += `

RECENT GRADES:
${ctx.grades.slice(0, 5).map((g: any) => `- ${g.subjects?.name || g.subject}: ${g.score}/${g.max_score || 100}`).join("\n")}`;
  }

  if (ctx?.assignments && ctx.assignments.length > 0) {
    prompt += `

PENDING ASSIGNMENTS:
${ctx.assignments.slice(0, 5).map((a: any) => `- ${a.subjects?.name || a.subject}: ${a.title} (Due: ${a.due_date})`).join("\n")}`;
  }

  if (ctx?.fees && ctx.fees.length > 0) {
    prompt += `

FEE RECORDS:
${ctx.fees.slice(0, 3).map((f: any) => `- ${f.amount_paid ? `Paid: KES ${f.amount_paid}` : `Balance: KES ${f.balance || 0}`}`).join("\n")}`;
  }

  if (ctx?.attendance && ctx.attendance.length > 0) {
    const present = ctx.attendance.filter((a: any) => a.status === "present").length;
    const total = ctx.attendance.length;
    prompt += `

ATTENDANCE: ${present}/${total} days present recently.`;
  }

  if (ctx?.calendarEvents && ctx.calendarEvents.length > 0) {
    prompt += `

UPCOMING EVENTS:
${ctx.calendarEvents.slice(0, 3).map((e: any) => `- ${e.title}: ${e.date}`).join("\n")}`;
  }

  if (ctx?.voraResults && ctx.voraResults.length > 0) {
    prompt += `

RELEVANT LEARNING VIDEOS:
${ctx.voraResults.slice(0, 3).map((v: any) => `- ${v.title} (${v.subject}, ${v.grade_level}): ${v.video_url}`).join("\n")}`;
  }

  if (ctx?.children && ctx.children.length > 0) {
    prompt += `

CHILDREN:
${ctx.children.slice(0, 3).map((c: any) => `- ${c.students?.admission_number || "Student"}: Grade ${c.students?.classes?.name || c.students?.grade_level}`).join("\n")}`;
  }

  // ACTIONS — CRITICAL FIX
  if (ctx?.availableActions && ctx.availableActions.length > 0) {
    prompt += `

AVAILABLE ACTIONS YOU CAN TRIGGER (ONLY when the user explicitly asks you to do something):
${ctx.availableActions.map((a) => `- ${a}`).join("\n")}

ACTION FORMAT — When you need to perform an action, output it as a JSON block at the VERY END of your response, AFTER your natural language reply. Use this exact format:

{\"actions\":[{\"type\":\"navigate\",\"target\":\"TARGET_NAME\",\"payload\":{}}]}

Valid targets: fees_management, vora, grades, timetable, assignments, attendance, calendar, library, messages, admissions, admin, teacher, student, parent, profile, settings.

RULES:
- Only include the JSON block if the user explicitly asked you to navigate or do something.
- Do NOT include the JSON block for general questions or explanations.
- The JSON must be the very last thing in your response.
- Do NOT wrap the JSON in markdown code blocks.`;
  }

  prompt += `

CURRENT DATE: ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

  return prompt;
}

export async function chatWithJoy(
  messages: { role: string; content: string }[],
  context?: AevibronContext
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);

  const payload = {
    model: "aevibron-core-v3",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 2048,
  };

  const res = await fetch(AEVIBRON_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Aevibron-Key": AEVIBRON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Aevibron error: ${res.status}`);
  }

  const data = await res.json();
  // Handle both direct response and choices format
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  if (data.content) {
    return data.content;
  }
  if (data.reply) {
    return data.reply;
  }
  if (typeof data === "string") {
    return data;
  }
  throw new Error("Unexpected response format from Aevibron");
}

export async function streamJoy(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  context?: AevibronContext
): Promise<void> {
  const systemPrompt = buildSystemPrompt(context);

  const payload = {
    model: "aevibron-core-v3",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  };

  const res = await fetch(AEVIBRON_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Aevibron-Key": AEVIBRON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Aevibron error: ${res.status}`);
  }

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
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const chunk = parsed.choices?.[0]?.delta?.content || parsed.delta?.content || parsed.chunk || "";
          if (chunk) onChunk(chunk);
        } catch { /* ignore */ }
      }
    }
  }
}
