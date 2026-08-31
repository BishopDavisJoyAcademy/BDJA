import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const {
      full_name,
      phone,
      avatar_url,
      preferences,
      terms_accepted,
    } = body;

    if (terms_accepted !== true) {
      return NextResponse.json(
        { error: "You must accept the terms and policies to continue" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Build update object explicitly — no dynamic Record to satisfy Supabase types
    const updatePayload: {
      onboarding_completed: boolean;
      updated_at: string;
      full_name?: string;
      phone?: string | null;
      avatar_url?: string | null;
    } = {
      onboarding_completed: true,
      updated_at: nowIso,
    };

    if (full_name !== undefined) updatePayload.full_name = full_name;
    if (phone !== undefined) updatePayload.phone = phone || null;
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url || null;

    // Update profile with verification
    const { data: updatedRows, error: updateError } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", session.userId)
      .select("id, onboarding_completed, full_name, phone, avatar_url");

    if (updateError) {
      console.error("[onboarding] Profile update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to complete onboarding: " + updateError.message },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.error("[onboarding] Profile update affected 0 rows. UserId:", session.userId);
      return NextResponse.json(
        { error: "Onboarding update failed silently — no rows affected" },
        { status: 500 }
      );
    }

    // Double-verify
    const { data: verifyRows } = await admin
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", session.userId)
      .limit(1);

    if (!verifyRows || verifyRows.length === 0 || verifyRows[0].onboarding_completed !== true) {
      console.error("[onboarding] CRITICAL: Verification failed after update. Got:", verifyRows?.[0]);
      return NextResponse.json(
        { error: "Onboarding could not be verified. Please try again." },
        { status: 500 }
      );
    }

    // Update auth user metadata — preserve existing
    const { data: authUser } = await admin.auth.admin.getUserById(session.userId);
    const existingMetadata = authUser?.user?.user_metadata || {};

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(session.userId, {
      user_metadata: {
        ...existingMetadata,
        onboarding_completed: true,
        onboarding_date: nowIso,
        preferences: preferences || existingMetadata.preferences || {},
      },
    });

    if (authUpdateError) {
      console.error("[onboarding] Auth metadata update failed:", authUpdateError.message);
      // Non-fatal — profile is the source of truth
    }

    await logAudit({
      user_id: session.userId,
      action: "ONBOARDING_COMPLETED",
      table_name: "profiles",
      record_id: session.userId,
      new_data: { onboarding_completed: true, full_name, phone, avatar_url },
      ip_address: getClientIP(req),
    }).catch((e) => console.error("[onboarding] Audit log failed:", e));

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      user: updatedRows[0],
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: (error as { statusCode?: number }).statusCode || 401 }
      );
    }
    console.error("[onboarding] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 }
    );
  }
}
