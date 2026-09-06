import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface UpdateReportBody {
  status?: "draft" | "published" | "archived";
  teacher_remarks?: string;
  principal_remarks?: string;
  ai_narrative?: string;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const hasPerm = await hasPermission(session.userId, "grades.manage");
    if (!hasPerm) {
      return NextResponse.json({ error: "grades.manage permission required" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as UpdateReportBody;
    const admin = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.teacher_remarks !== undefined) updateData.teacher_remarks = body.teacher_remarks;
    if (body.principal_remarks !== undefined) updateData.principal_remarks = body.principal_remarks;
    if (body.ai_narrative !== undefined) updateData.ai_narrative = body.ai_narrative;

    if (body.status === "published") {
      updateData.published_at = new Date().toISOString();
      updateData.publish_method = "manual";
    }

    updateData.reviewed_by = session.userId;
    updateData.reviewed_at = new Date().toISOString();

    const { data, error } = await admin
      .from("report_cards")
      .update(updateData as never)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    return NextResponse.json({ success: true, report: data });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/reports/update] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
