"use server";

import { getSupabaseAdmin } from "./supabase-server";

export interface AuditLogEntry {
  user_id?: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, any>;
  impersonated_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    await admin.from("audit_logs").insert({
      user_id: entry.user_id,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id,
      metadata: entry.metadata || {},
      impersonated_user_id: entry.impersonated_user_id,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[audit] Failed to log audit entry:", error);
  }
}

export async function logLoginAttempt(email: string, success: boolean, ip?: string): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    await admin.from("login_attempts").insert({ email, ip_address: ip || null, success });
  } catch (error) {
    console.error("[audit] Failed to log login attempt:", error);
  }
}

export async function logImpersonation(adminId: string, targetUserId: string, action: "start" | "end", ip?: string, userAgent?: string): Promise<void> {
  await logAudit({
    user_id: adminId,
    action: action === "start" ? "IMPERSONATION_START" : "IMPERSONATION_END",
    target_type: "user",
    target_id: targetUserId,
    impersonated_user_id: targetUserId,
    ip_address: ip,
    user_agent: userAgent,
  });
}

export async function logPermissionChange(adminId: string, targetUserId: string, added: string[], removed: string[], ip?: string): Promise<void> {
  await logAudit({
    user_id: adminId,
    action: "PERMISSION_CHANGE",
    target_type: "staff_permissions",
    target_id: targetUserId,
    metadata: { added, removed },
    ip_address: ip,
  });
}
