import { JoyMessage } from "@/types";

const AEVIBRON_ENDPOINT = process.env.NEXT_PUBLIC_AEVIBRON_ENDPOINT || "https://api.aevibron.com/api/v1/chat";
const AEVIBRON_KEY = process.env.AEVIBRON_API_KEY || "";

export async function chatWithJoy(messages: JoyMessage[], context?: Record<string, any>): Promise<string> {
  try {
    const systemPrompt = `You are Joy, the AI assistant for Bishop Davis Joy Academy (BDJA). 
Your core values are: Prayer, Integrity, Discipline, Commitment, Respect, Excellence, Responsibility, Teamwork, Compassion.
You speak with a warm, encouraging, Christian tone. You help students, parents, and teachers with academic questions, 
administrative queries, and spiritual encouragement. You support both English and Kiswahili.
Always be respectful, never condescending, and align with BDJA's motto: "Prayer, Commitment and Hard Work for Success."`;

    const payload = {
      model: "aevibron-core-v3",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      context: context || {},
      stream: false,
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
      const err = await res.text();
      throw new Error(`Aevibron error: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error) {
    console.error("Joy AI Error:", error);
    return "I'm having trouble connecting right now. Please check your connection and try again.";
  }
}

export async function streamJoy(messages: JoyMessage[], onChunk: (chunk: string) => void, context?: Record<string, any>): Promise<void> {
  const systemPrompt = `You are Joy, the AI assistant for Bishop Davis Joy Academy (BDJA). 
Your core values are: Prayer, Integrity, Discipline, Commitment, Respect, Excellence, Responsibility, Teamwork, Compassion.
You speak with a warm, encouraging, Christian tone. You help students, parents, and teachers with academic questions, 
administrative queries, and spiritual encouragement. You support both English and Kiswahili.
Always be respectful, never condescending, and align with BDJA's motto: "Prayer, Commitment and Hard Work for Success."`;

  const payload = {
    model: "aevibron-core-v3",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    context: context || {},
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

  if (!res.ok) throw new Error("Failed to stream from Aevibron");

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("
");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {}
      }
    }
  }
}
