"use server";

import { getSupabaseAdmin } from "./supabase-server";

export interface AuditLogEntry {
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  new_data?: Record<string, any>;
  old_data?: Record<string, any>;
  impersonated_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    interface AuditInsertRow {
      user_id: string | null;
      action: string;
      table_name: string | null;
      record_id: string | null;
      new_data: Record<string, any> | null;
      old_data: Record<string, any> | null;
      impersonated_user_id: string | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: string | null;
    }

    await admin.from("audit_logs").insert({
      user_id: entry.user_id || null,
      action: entry.action,
      table_name: entry.table_name || null,
      record_id: entry.record_id || null,
      new_data: entry.new_data || null,
      old_data: entry.old_data || null,
      impersonated_user_id: entry.impersonated_user_id || null,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      created_at: new Date().toISOString(),
    } as AuditInsertRow);
  } catch (error) {
    console.error("[audit] Failed to log audit entry:", error);
  }
}

export async function logLoginAttempt(email: string, success: boolean, ip?: string): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    interface LoginAttemptRow {
      email: string;
      ip_address: unknown;
      success: boolean | null;
      created_at: string | null;
    }

    await admin.from("login_attempts").insert({
      email,
      ip_address: ip || null,
      success,
      created_at: new Date().toISOString(),
    } as LoginAttemptRow);
  } catch (error) {
    console.error("[audit] Failed to log login attempt:", error);
  }
}

export async function logImpersonation(adminId: string, targetUserId: string, action: "start" | "end", ip?: string, userAgent?: string): Promise<void> {
  await logAudit({
    user_id: adminId,
    action: action === "start" ? "IMPERSONATION_START" : "IMPERSONATION_END",
    table_name: "profiles",
    record_id: targetUserId,
    impersonated_user_id: targetUserId,
    ip_address: ip,
    user_agent: userAgent,
  });
}

export async function logPermissionChange(adminId: string, targetUserId: string, added: string[], removed: string[], ip?: string): Promise<void> {
  await logAudit({
    user_id: adminId,
    action: "PERMISSION_CHANGE",
    table_name: "staff_permissions",
    record_id: targetUserId,
    new_data: { added, removed },
    ip_address: ip,
  });
}
