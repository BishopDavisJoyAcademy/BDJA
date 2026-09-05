import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const sendMessageSchema = z.object({
  child_id: z.string().uuid("Valid child ID is required"),
  teacher_id: z.string().uuid("Valid teacher ID is required"),
  content: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("child_id");
    const teacherId = searchParams.get("teacher_id");

    if (!childId) {
      return NextResponse.json({ error: "child_id is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify parent access
    const { data: authCheck } = await admin
      .from("parent_children")
      .select("id")
      .eq("parent_id", session.userId)
      .eq("student_id", childId)
      .limit(1);

    let authorized = (authCheck && authCheck.length > 0);
    if (!authorized) {
      const { data: legacyCheck } = await admin
        .from("parent_students")
        .select("id")
        .eq("parent_id", session.userId)
        .eq("student_id", childId)
        .limit(1);
      authorized = (legacyCheck && legacyCheck.length > 0);
    }

    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let query = admin
      .from("parent_teacher_messages")
      .select(`
        *,
        teacher:teacher_id(full_name, avatar_url),
        parent:parent_id(full_name, avatar_url)
      `)
      .eq("student_id", childId)
      .eq("parent_id", session.userId);

    if (teacherId) query = query.eq("teacher_id", teacherId);

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      console.error("[api/parent/messages GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/messages GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const parseResult = sendMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { child_id, teacher_id, content } = parseResult.data;

    // Verify parent access to child
    const { data: authCheck } = await admin
      .from("parent_children")
      .select("id")
      .eq("parent_id", session.userId)
      .eq("student_id", child_id)
      .limit(1);

    let authorized = (authCheck && authCheck.length > 0);
    if (!authorized) {
      const { data: legacyCheck } = await admin
        .from("parent_students")
        .select("id")
        .eq("parent_id", session.userId)
        .eq("student_id", child_id)
        .limit(1);
      authorized = (legacyCheck && legacyCheck.length > 0);
    }

    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("parent_teacher_messages")
      .insert({
        parent_id: session.userId,
        teacher_id,
        student_id: child_id,
        content,
        sent_by: "parent",
        read_by_parent: true,
        read_by_teacher: false,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[api/parent/messages POST] Supabase error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/messages POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
