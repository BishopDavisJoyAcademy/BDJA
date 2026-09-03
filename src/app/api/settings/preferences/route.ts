import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET — fetch current user's preferences from auth user_metadata
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(session.userId);
    if (authErr || !authUser?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const meta = authUser.user.user_metadata || {};
    const prefs = {
      email_notifications: meta.email_notifications ?? true,
      sms_notifications: meta.sms_notifications ?? false,
      theme: meta.theme ?? "dark",
      language: meta.language ?? "en",
    };

    return NextResponse.json({ preferences: prefs });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[settings/preferences GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — update current user's preferences in auth user_metadata
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const allowedFields = ["email_notifications", "sms_notifications", "theme", "language"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Get existing metadata to merge
    const { data: authUser } = await admin.auth.admin.getUserById(session.userId);
    const existingMetadata = authUser?.user?.user_metadata || {};

    const { error: updateError } = await admin.auth.admin.updateUserById(session.userId, {
      user_metadata: {
        ...existingMetadata,
        ...updates,
      },
    });

    if (updateError) {
      console.error("[settings/preferences PUT] Update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update preferences: " + updateError.message },
        { status: 500 }
      );
    }

    // Audit log
    await logAudit({
      user_id: session.userId,
      action: "PREFERENCES_UPDATED",
      table_name: "auth.users",
      record_id: session.userId,
      new_data: updates,
      ip_address: getClientIP(req),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[settings/preferences PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
