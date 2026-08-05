/**
 * GET /api/auth/me
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      const statusCode =
        error?.code === "NO_SESSION" || error?.code === "INVALID_TOKEN" ? 401 :
        error?.code === "ACCOUNT_LOCKED" ? 403 :
        error?.code === "PROFILE_INACTIVE" ? 403 :
        error?.code === "PROFILE_MISSING" ? 404 :
        error?.code === "RATE_LIMITED" ? 429 : 500;
      return NextResponse.json(
        {
          error: error?.message || "Unauthorized",
          code: error?.code || "UNKNOWN",
          details: error?.details,
          retryAfter: error?.retryAfter,
        },
        { status: statusCode }
      );
    }
    return NextResponse.json({
      user: { id: session.userId, email: session.email },
      profile: {
        role: session.role,
        full_name: session.fullName,
        campus_id: session.campusId,
        is_active: session.isActive,
        password_changed: session.passwordChanged,
        onboarding_completed: session.onboardingCompleted,
      },
    });
  } catch (error: any) {
    console.error("[auth/me] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "SERVER_ERROR", details: error.message },
      { status: 500 }
    );
  }
}
