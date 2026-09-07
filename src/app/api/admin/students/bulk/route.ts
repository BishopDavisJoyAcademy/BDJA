import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "students.edit");

    const body = await req.json();
    const { action, userIds, targetGrade, targetClass } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds array required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (action === "promote" && targetGrade) {
      const { error } = await admin
        .from("students")
        .update({ grade_level: targetGrade })
        .in("id", userIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await logAudit({
        user_id: session.userId,
        action: "BULK_PROMOTE",
        table_name: "students",
        new_data: { userIds, targetGrade },
        ip_address: getClientIP(req),
      });

      return NextResponse.json({ success: true, count: userIds.length });
    }

    if (action === "transfer" && targetClass) {
      const { error } = await admin
        .from("students")
        .update({ class_id: targetClass })
        .in("id", userIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await logAudit({
        user_id: session.userId,
        action: "BULK_TRANSFER",
        table_name: "students",
        new_data: { userIds, targetClass },
        ip_address: getClientIP(req),
      });

      return NextResponse.json({ success: true, count: userIds.length });
    }

    if (action === "archive") {
      const { error: profileError } = await admin
        .from("profiles")
        .update({ is_active: false })
        .in("id", userIds);
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

      const { error: studentError } = await admin
        .from("students")
        .update({ status: "graduated" })
        .in("id", userIds);
      if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });

      await logAudit({
        user_id: session.userId,
        action: "BULK_ARCHIVE",
        table_name: "students",
        new_data: { userIds },
        ip_address: getClientIP(req),
      });

      return NextResponse.json({ success: true, count: userIds.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
