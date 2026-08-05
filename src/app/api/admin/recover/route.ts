/**
 * POST /api/admin/recover
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession, requireRole } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { restoreMissingProfile } from "@/lib/auth";
import { unlockAccount, revokeAllSessions } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { z } from "zod";

export const dynamic = "force-dynamic";

const recoverSchema = z.object({
  action: z.enum(["restore_own_profile", "unlock_account", "force_logout", "restore_profile"]),
  target_user_id: z.string().uuid().optional(),
  reason: z.string().min(1).max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = recoverSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const { action, target_user_id, reason } = parseResult.data;

    if (action === "restore_own_profile") {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!token) {
        return NextResponse.json({ error: "Unauthorized", code: "NO_TOKEN" }, { status: 401 });
      }
      const { createServerClient } = await import("@supabase/ssr");
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return []; }, setAll() {} } }
      );
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return NextResponse.json({ error: "Invalid token", code: "INVALID_TOKEN" }, { status: 401 });
      }
      const success = await restoreMissingProfile(user.id);
      if (success) {
        await logAudit({
          user_id: user.id,
          action: "PROFILE_RESTORED",
          target_type: "profile",
          target_id: user.id,
          metadata: { method: "self_recovery" },
          ip_address: getClientIP(req),
          user_agent: req.headers.get("user-agent") || undefined,
        }).catch(() => {});
        return NextResponse.json({
          success: true,
          message: "Profile restored successfully. Please refresh the page.",
        });
      }
      return NextResponse.json(
        { error: "Could not restore profile. Please contact the administrator.", code: "RESTORE_FAILED" },
        { status: 500 }
      );
    }

    const session = await validateSession(req);
    if (session.error || !session.session) {
      return NextResponse.json(
        { error: session.error?.message || "Unauthorized", code: session.error?.code },
        { status: 401 }
      );
    }
    requireRole(session.session, ["principal", "super_admin"]);
    const adminId = session.session.userId;
    const adminName = session.session.fullName;

    switch (action) {
      case "unlock_account": {
        if (!target_user_id) {
          return NextResponse.json({ error: "target_user_id required", code: "MISSING_FIELD" }, { status: 400 });
        }
        const result = await unlockAccount(adminId, target_user_id, reason || `Unlocked by ${adminName}`);
        if (result.success) {
          await logAudit({
            user_id: adminId,
            action: "ACCOUNT_UNLOCKED",
            target_type: "profile",
            target_id: target_user_id,
            metadata: { reason: reason || "Admin unlock" },
            ip_address: getClientIP(req),
            user_agent: req.headers.get("user-agent") || undefined,
          }).catch(() => {});
          return NextResponse.json({ success: true, message: "Account unlocked successfully" });
        }
        return NextResponse.json({ error: result.error, code: "UNLOCK_FAILED" }, { status: 500 });
      }
      case "force_logout": {
        if (!target_user_id) {
          return NextResponse.json({ error: "target_user_id required", code: "MISSING_FIELD" }, { status: 400 });
        }
        await revokeAllSessions(target_user_id, adminId, reason || `Force logout by ${adminName}`);
        const admin = getSupabaseAdmin();
        await admin.auth.admin.signOut(target_user_id).catch(() => {});
        await logAudit({
          user_id: adminId,
          action: "FORCE_LOGOUT",
          target_type: "profile",
          target_id: target_user_id,
          metadata: { reason: reason || "Admin force logout" },
          ip_address: getClientIP(req),
          user_agent: req.headers.get("user-agent") || undefined,
        }).catch(() => {});
        return NextResponse.json({ success: true, message: "All sessions revoked successfully" });
      }
      case "restore_profile": {
        if (!target_user_id) {
          return NextResponse.json({ error: "target_user_id required", code: "MISSING_FIELD" }, { status: 400 });
        }
        const success = await restoreMissingProfile(target_user_id);
        if (success) {
          await logAudit({
            user_id: adminId,
            action: "PROFILE_RESTORED",
            target_type: "profile",
            target_id: target_user_id,
            metadata: { method: "admin_recovery", reason },
            ip_address: getClientIP(req),
            user_agent: req.headers.get("user-agent") || undefined,
          }).catch(() => {});
          return NextResponse.json({ success: true, message: "Profile restored successfully" });
        }
        return NextResponse.json({ error: "Could not restore profile", code: "RESTORE_FAILED" }, { status: 500 });
      }
      default:
        return NextResponse.json({ error: "Unknown action", code: "UNKNOWN_ACTION" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[admin/recover] Error:", error);
    if (error.name === "AuthRequiredError") {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: error.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
