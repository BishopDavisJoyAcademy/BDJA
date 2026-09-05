import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pageAssistantSchema = z.object({
  page_route: z.string().min(1).max(200),
  page_name: z.string().min(1).max(100),
  context_prompt: z.string().min(1).max(5000),
  suggested_actions: z.array(z.object({
    text: z.string(),
    action: z.string(),
  })).default([]),
  required_permission: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const route = searchParams.get("route");

    let query = admin.from("joy_page_assistants").select("*");

    if (route) {
      query = query.eq("page_route", route).single();
      const { data, error } = await query;
      if (error && error.code !== "PGRST116") throw error;
      return NextResponse.json({ assistant: data });
    }

    query = query.eq("is_active", true).order("page_name", { ascending: true });
    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ assistants: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/page-assistants GET] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to load page assistants" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const isAdmin = await hasPermission(session.userId, "admin.access");
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = pageAssistantSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("joy_page_assistants")
      .upsert(
        {
          page_route: parseResult.data.page_route,
          page_name: parseResult.data.page_name,
          context_prompt: parseResult.data.context_prompt,
          suggested_actions: parseResult.data.suggested_actions,
          required_permission: parseResult.data.required_permission,
          is_active: parseResult.data.is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_route" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ assistant: data });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/page-assistants POST] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to save page assistant" }, { status: 500 });
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
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("joy_page_assistants").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/page-assistants DELETE] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to delete page assistant" }, { status: 500 });
  }
}
