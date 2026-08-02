import { getSupabaseAdmin() } from "./supabase-server";

export interface AuditAction {
  user_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export async function logAudit(action: AuditAction) {
  try {
    await getSupabaseAdmin().from("audit_logs").insert({
      user_id: action.user_id,
      action: action.action,
      target_type: action.target_type || null,
      target_id: action.target_id || null,
      metadata: action.metadata || {},
      ip_address: action.ip_address || null,
      user_agent: action.user_agent || null,
    });
  } catch (err) {
    // Never throw from audit logging - log to console instead
    console.error("Audit log failed:", err);
  }
}
