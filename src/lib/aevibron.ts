import { JoyMessage } from "@/types";

export function getAevibronEndpoint(): string {
  const url = process.env.NEXT_PUBLIC_AEVIBRON_ENDPOINT;
  if (!url) {
    throw new Error("NEXT_PUBLIC_AEVIBRON_ENDPOINT environment variable is required");
  }
  return url;
}

export function getAevibronKey(): string {
  const key = process.env.AEVIBRON_API_KEY;
  if (!key) {
    throw new Error("AEVIBRON_API_KEY environment variable is required");
  }
  return key;
}

export interface AevibronContext {
  userName?: string;
  userCategory?: string;
  gradeLevel?: string;
  designation?: string;
  campusId?: string;
  timetable?: Array<Record<string, unknown>>;
  grades?: Array<Record<string, unknown>>;
  assignments?: Array<Record<string, unknown>>;
  fees?: Array<Record<string, unknown>>;
  attendance?: Array<Record<string, unknown>>;
  calendarEvents?: Array<Record<string, unknown>>;
  voraResults?: Array<Record<string, unknown>>;
  children?: Array<Record<string, unknown>>;
  availableActions?: string[];
  personality?: string;
  language?: string;
}

interface AevibronPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
  stream?: boolean;
}

interface AevibronResponse {
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
  }>;
  content?: string;
  reply?: string;
}

function getString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
  return undefined;
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  return undefined;
}

export function buildSystemPrompt(ctx?: AevibronContext): string {
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
${ctx.timetable.slice(0, 5).map((t) => {
      const subjects = getRecord(t.subjects);
      const subjectName = getString(subjects?.name) || getString(t.subject) || "Unknown";
      const day = getString(t.day_of_week) || "Unknown";
      const start = getString(t.start_time) || "";
      const end = getString(t.end_time) || "";
      return `- ${day}: ${subjectName} (${start}-${end})`;
    }).join("\n")}`;
  }

  if (ctx?.grades && ctx.grades.length > 0) {
    prompt += `

RECENT GRADES:
${ctx.grades.slice(0, 5).map((g) => {
      const subjects = getRecord(g.subjects);
      const subjectName = getString(subjects?.name) || getString(g.subject) || "Unknown";
      const score = getNumber(g.score) ?? 0;
      const max = getNumber(g.max_score) || 100;
      return `- ${subjectName}: ${score}/${max}`;
    }).join("\n")}`;
  }

  if (ctx?.assignments && ctx.assignments.length > 0) {
    prompt += `

PENDING ASSIGNMENTS:
${ctx.assignments.slice(0, 5).map((a) => {
      const subjects = getRecord(a.subjects);
      const subjectName = getString(subjects?.name) || getString(a.subject) || "Unknown";
      const title = getString(a.title) || "Untitled";
      const due = getString(a.due_date) || "Unknown";
      return `- ${subjectName}: ${title} (Due: ${due})`;
    }).join("\n")}`;
  }

  if (ctx?.fees && ctx.fees.length > 0) {
    prompt += `

FEE RECORDS:
${ctx.fees.slice(0, 3).map((f) => {
      const amount = getNumber(f.amount_paid);
      const balance = getNumber(f.balance);
      if (amount !== undefined) return `- Paid: KES ${amount}`;
      if (balance !== undefined) return `- Balance: KES ${balance}`;
      return `- Fee record`;
    }).join("\n")}`;
  }

  if (ctx?.attendance && ctx.attendance.length > 0) {
    const present = ctx.attendance.filter((a) => getString(a.status) === "present").length;
    const total = ctx.attendance.length;
    prompt += `

ATTENDANCE: ${present}/${total} days present recently.`;
  }

  if (ctx?.calendarEvents && ctx.calendarEvents.length > 0) {
    prompt += `

UPCOMING EVENTS:
${ctx.calendarEvents.slice(0, 3).map((e) => {
      const title = getString(e.title) || "Event";
      const date = getString(e.date) || "Unknown";
      return `- ${title}: ${date}`;
    }).join("\n")}`;
  }

  if (ctx?.voraResults && ctx.voraResults.length > 0) {
    prompt += `

RELEVANT LEARNING VIDEOS:
${ctx.voraResults.slice(0, 3).map((v) => {
      const title = getString(v.title) || "Video";
      const subject = getString(v.subject) || "";
      const grade = getString(v.grade_level) || "";
      const url = getString(v.video_url) || "";
      return `- ${title} (${subject}, ${grade}): ${url}`;
    }).join("\n")}`;
  }

  if (ctx?.children && ctx.children.length > 0) {
    prompt += `

CHILDREN:
${ctx.children.slice(0, 3).map((c) => {
      const students = getRecord(c.students);
      const id = getString(students?.admission_number) || "Student";
      const classes = getRecord(students?.classes);
      const grade = getString(classes?.name) || getString(students?.grade_level) || "Unknown";
      return `- ${id}: Grade ${grade}`;
    }).join("\n")}`;
  }

  if (ctx?.availableActions && ctx.availableActions.length > 0) {
    prompt += `

AVAILABLE ACTIONS YOU CAN TRIGGER (ONLY when the user explicitly asks you to do something):
${ctx.availableActions.map((a) => `- ${a}`).join("\n")}

ACTION FORMAT — When you need to perform an action, output it as a JSON block at the VERY END of your response, AFTER your natural language reply. Use this exact format:

{"actions":[{"type":"navigate","target":"TARGET_NAME","payload":{}}]}

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
  messages: Array<{ role: string; content: string }>,
  context?: AevibronContext
): Promise<string> {
  const endpoint = getAevibronEndpoint();
  const key = getAevibronKey();
  const systemPrompt = buildSystemPrompt(context);

  const payload: AevibronPayload = {
    model: "aevibron-core-v3",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 2048,
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
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message || `Aevibron error: ${res.status}`);
  }

  const data = (await res.json()) as AevibronResponse;
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  if (data.content) {
    return data.content;
  }
  if (data.reply) {
    return data.reply;
  }
  throw new Error("Unexpected response format from Aevibron");
}

export async function streamJoy(
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void,
  context?: AevibronContext
): Promise<void> {
  const endpoint = getAevibronEndpoint();
  const key = getAevibronKey();
  const systemPrompt = buildSystemPrompt(context);

  const payload: AevibronPayload = {
    model: "aevibron-core-v3",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
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
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message || `Aevibron error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

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
        const parsed = JSON.parse(data) as { chunk?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.chunk) onChunk(parsed.chunk);
      } catch {
        // ignore malformed lines
      }
    }
  }
}
