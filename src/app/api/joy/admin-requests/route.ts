import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().optional(),
  conversation_id: z.string().uuid().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  category: z.enum(["general", "fees", "policies", "calendar", "academic", "technical"]).default("general"),
});

const responseSchema = z.object({
  request_id: z.string().uuid(),
  admin_response: z.string().min(1).max(5000),
  status: z.enum(["answered", "dismissed"]).default("answered"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const isAdmin = await hasPermission(session.userId, "admin.access");

    let query = admin.from("joy_admin_requests").select("*, responded_by:responded_by(full_name)");

    if (!isAdmin) {
      // Non-admins see only their own requests
      query = query.eq("user_id", session.userId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ requests: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/admin-requests GET] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Get user name
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, user_category")
      .eq("id", session.userId)
      .single();

    const { data, error } = await admin
      .from("joy_admin_requests")
      .insert({
        user_id: session.userId,
        user_name: profile?.full_name || "Unknown",
        user_category: profile?.user_category || "student",
        conversation_id: parseResult.data.conversation_id,
        question: parseResult.data.question,
        context: parseResult.data.context,
        priority: parseResult.data.priority,
        category: parseResult.data.category,
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification to all admins
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("user_category", "admin");

    if (admins && admins.length > 0) {
      const notifications = admins.map((a) => ({
        user_id: a.id,
        title: "New Joy Request",
        content: `${profile?.full_name || "A user"} asked: "${parseResult.data.question.slice(0, 100)}..."`,
        type: "system",
        read: false,
      }));

      await admin.from("notifications").insert(notifications);
    }

    return NextResponse.json({ request: data });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/admin-requests POST] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const isAdmin = await hasPermission(session.userId, "admin.access");
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = responseSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("joy_admin_requests")
      .select("user_id, question")
      .eq("id", parseResult.data.request_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("joy_admin_requests")
      .update({
        status: parseResult.data.status,
        admin_response: parseResult.data.admin_response,
        responded_by: session.userId,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseResult.data.request_id)
      .select()
      .single();

    if (error) throw error;

    // Notify the original user
    await admin.from("notifications").insert({
      user_id: existing.user_id,
      title: "Joy has an answer for you",
      content: `Your question "${existing.question.slice(0, 80)}..." has been answered. Check Joy for the response.`,
      type: "system",
      read: false,
    });

    return NextResponse.json({ request: data });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/admin-requests PATCH] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to respond to request" }, { status: 500 });
  }
}
