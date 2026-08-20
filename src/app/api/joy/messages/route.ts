import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(50000),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }

    // Verify conversation belongs to user
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", session.user.id)
      .single();

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ messages: data || [] });
  } catch (error: any) {
    console.error("[joy/messages GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const parseResult = messageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { conversation_id, role, content, metadata } = parseResult.data;

    // Verify conversation belongs to user
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .eq("user_id", session.user.id)
      .single();

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("conversation_messages")
      .insert({
        conversation_id,
        role,
        content,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ message: data });
  } catch (error: any) {
    console.error("[joy/messages POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save message" }, { status: 500 });
  }
}
