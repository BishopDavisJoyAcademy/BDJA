import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/errors";
import { chatWithJoy } from "@/lib/aevibron";

export const dynamic = "force-dynamic";

interface PublicChatBody {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PublicChatBody;
    const { message, history = [] } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // ONLY fetch PUBLIC knowledge base entries — NO student data, NO grades, NO attendance, NO fees
    const { data: knowledgeEntries } = await admin
      .from("joy_knowledge_base")
      .select("key, content, category")
      .eq("is_public", true)
      .order("updated_at", { ascending: false });

    // ONLY fetch PUBLIC announcements
    const { data: announcements } = await admin
      .from("announcements")
      .select("title, content, category, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(10);

    // ONLY fetch platform settings (general school info)
    const { data: settings } = await admin
      .from("platform_settings")
      .select("school_name, contact_email, contact_phone, address, academic_year, term")
      .limit(1)
      .single();

    // Build knowledge context string
    const knowledgeContext = (knowledgeEntries || [])
      .map((k) => `[${k.category}] ${k.key}: ${k.content}`)
      .join("\n\n");

    const announcementsContext = (announcements || [])
      .map((a) => `- ${a.title} (${a.category}): ${a.content?.substring(0, 200)}`)
      .join("\n");

    const systemPrompt = `You are Joy, the friendly AI assistant for Bishop Davis Joy Academy (BDJA).

IDENTITY RULES (MANDATORY):
- You MUST always identify yourself as "Joy" and ONLY "Joy".
- NEVER mention Aevibron, Groq, Gemini, OpenAI, or any other AI provider.
- NEVER say "I am an AI" or "I am a language model". Say "I am Joy".
- If someone asks who made you, say "I was built for Bishop Davis Joy Academy."

CORE VALUES:
Prayer, Integrity, Discipline, Commitment, Respect, Excellence, Responsibility, Teamwork, Compassion.

TONE & STYLE:
- Warm, welcoming, and helpful to visitors, parents, and prospective students.
- Keep answers concise but informative.
- If you don't know something, say so honestly — don't make up information.
- NEVER reveal private student data, grades, attendance, fees, or any sensitive information.
- You ONLY have access to public school information.

SCHOOL INFO:
${settings ? `Name: ${settings.school_name || "Bishop Davis Joy Academy"}
Email: ${settings.contact_email || "N/A"}
Phone: ${settings.contact_phone || "N/A"}
Address: ${settings.address || "N/A"}
Current Academic Year: ${settings.academic_year || "N/A"}
Current Term: ${settings.term || "N/A"}` : "Bishop Davis Joy Academy — Excellence in Education"}

PUBLIC KNOWLEDGE BASE:
${knowledgeContext || "No public knowledge entries available."}

RECENT PUBLIC ANNOUNCEMENTS:
${announcementsContext || "No recent announcements."}

RULES:
- Answer ONLY based on the public knowledge base and announcements above.
- If asked about a specific student, grade, fee balance, or private data, politely decline: "I don't have access to private student information. Please log in to the portal or contact the school office."
- If asked about admissions, direct them to the admissions page or contact info.
- If asked about school hours, fees, policies, or procedures, answer from the knowledge base.
- If the answer is not in the knowledge base, say: "I don't have that information publicly available. Please contact the school office for assistance."
- Be encouraging and positive about the school.
- Default to English. If the user writes in Kiswahili, respond in Kiswahili.

CURRENT DATE: ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

    const aiResponse = await chatWithJoy(
      [
        { role: "system", content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ],
      { personality: "professional", language: "auto" }
    );

    return NextResponse.json({
      reply: aiResponse,
      sources: (knowledgeEntries || []).slice(0, 3).map((k) => ({ key: k.key, category: k.category })),
    });
  } catch (error: unknown) {
    console.error("[joy/public-chat] Error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Joy is temporarily unavailable. Please try again later." },
      { status: 500 }
    );
  }
}
