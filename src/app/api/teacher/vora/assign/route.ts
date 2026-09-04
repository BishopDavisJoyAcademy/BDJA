import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { content_id, class_ids } = body;

    if (!content_id || !class_ids || !Array.isArray(class_ids) || class_ids.length === 0) {
      return NextResponse.json({ error: "content_id and class_ids array are required" }, { status: 400 });
    }

    // Verify teacher has access to these classes
    const { data: teacherClasses } = await admin
      .from("classes")
      .select("id")
      .eq("class_teacher_id", session.userId)
      .in("id", class_ids);

    const { data: teacherSubjects } = await admin
      .from("class_subjects")
      .select("class_id")
      .eq("teacher_id", session.userId)
      .in("class_id", class_ids);

    const allowedClassIds = new Set([
      ...(teacherClasses?.map((c) => c.id) || []),
      ...(teacherSubjects?.map((s) => s.class_id) || []),
    ]);

    if (allowedClassIds.size === 0 && session.userCategory !== "admin") {
      return NextResponse.json({ error: "You do not have access to these classes" }, { status: 403 });
    }

    // Get content info
    const { data: content } = await admin
      .from("vora_content")
      .select("id, title, subject_id")
      .eq("id", content_id)
      .maybeSingle();

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Update content with class assignments
    const { error: updateError } = await admin
      .from("vora_content")
      .update({ class_id: class_ids[0] }) // Primary class
      .eq("id", content_id);

    if (updateError) {
      console.error("[vora/assign POST] Update error:", updateError);
      return NextResponse.json({ error: "Failed to assign content" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "VORA_ASSIGNED",
      table_name: "vora_content",
      record_id: content_id,
      new_data: { class_ids, content_id },
      ip_address: getClientIP(req),
    }).catch(() => {});

    return NextResponse.json({ success: true, message: `Assigned to ${class_ids.length} class(es)` });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[vora/assign POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
