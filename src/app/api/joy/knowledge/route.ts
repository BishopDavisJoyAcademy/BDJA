import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

export const dynamic = "force-dynamic";

const knowledgeSchema = z.object({
  key: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  category: z.enum(["motto", "vision", "mission", "policies", "fees", "calendar", "contacts", "procedures", "rules", "general"]),
  is_public: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const key = searchParams.get("key");

    let query = admin.from("joy_knowledge_base").select("*");

    if (key) {
      query = query.eq("key", key).single();
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ knowledge: data });
    }

    if (category) {
      query = query.eq("category", category);
    }

    query = query.eq("is_public", true).order("category", { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ knowledge: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/knowledge GET] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to load knowledge base" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    // Only admins can manage knowledge base
    const isAdmin = await hasPermission(session.userId, "admin.access");
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = knowledgeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("joy_knowledge_base")
      .upsert(
        {
          key: parseResult.data.key,
          content: parseResult.data.content,
          category: parseResult.data.category,
          is_public: parseResult.data.is_public,
          updated_by: session.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ knowledge: data });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/knowledge POST] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to save knowledge" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const isAdmin = await hasPermission(session.userId, "admin.access");
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Key required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("joy_knowledge_base").delete().eq("key", key);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/knowledge DELETE] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to delete knowledge" }, { status: 500 });
  }
}
