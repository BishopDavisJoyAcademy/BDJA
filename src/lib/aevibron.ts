import { JoyMessage } from "@/types";

const AEVIBRON_ENDPOINT = process.env.NEXT_PUBLIC_AEVIBRON_ENDPOINT || "https://api.aevibron.com/api/v1/chat";
const AEVIBRON_KEY = process.env.AEVIBRON_API_KEY || "";

const DEFAULT_SYSTEM_PROMPT = `You are Joy, the AI assistant for Bishop Davis Joy Academy (BDJA). 
Your core values are: Prayer, Integrity, Discipline, Commitment, Respect, Excellence, Responsibility, Teamwork, Compassion.
You speak with a warm, encouraging, Christian tone. You help students, parents, and teachers with academic questions, 
administrative queries, and spiritual encouragement. You support both English and Kiswahili.
Always be respectful, never condescending, and align with BDJA's motto: "Prayer, Commitment and Hard Work for Success."`;

function getSystemPrompt(context?: Record<string, any>): string {
  let prompt = DEFAULT_SYSTEM_PROMPT;
  if (context?.userName) {
    prompt += `\nYou are speaking with ${context.userName}.`;
  }
  if (context?.gradeLevel) {
    prompt += `\nThe student is in ${context.gradeLevel}. Tailor explanations appropriately.`;
  }
  if (context?.voraResults && context.voraResults.length > 0) {
    prompt += `\n\nLOCAL VORA CONTENT AVAILABLE:\n`;
    context.voraResults.forEach((v: any, i: number) => {
      prompt += `${i + 1}. ${v.title} (${v.subject}, ${v.grade_level}) - ${v.summary?.substring(0, 100) || "No summary"}\n`;
    });
    prompt += `\nWhen relevant, recommend these local videos to the user and explain how they relate to their question.`;
  }
  return prompt;
}

export async function chatWithJoy(messages: JoyMessage[], context?: Record<string, any>): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const systemPrompt = getSystemPrompt(context);
    const payload = {
      model: context?.model || "aevibron-core-v3",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      context: { ...context, voraResults: undefined },
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
  context?: Record<string, any>
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const systemPrompt = getSystemPrompt(context);
    const payload = {
      model: context?.model || "aevibron-core-v3",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      context: { ...context, voraResults: undefined },
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
