import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Recursive JSON type matching Supabase's Json type
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(jsonSchema),
  ])
);

const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(50000),
  metadata: jsonSchema.optional(),
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

    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", session.userId)
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load messages";
    console.error("[joy/messages GET] Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
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

    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .eq("user_id", session.userId)
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
        ...(metadata ? { metadata } : {}),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ message: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save message";
    console.error("[joy/messages POST] Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
