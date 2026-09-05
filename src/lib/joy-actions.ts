"use server";

import { createClient } from "@supabase/supabase-js";
import { getErrorMessage } from "./errors";
import { hasPermission } from "./permissions";
import { getSupabaseAdmin } from "./supabase-server";
import { JOY_BLACKLISTED_TABLES, isTableAllowed } from "./joy-guardrails";

// ============================================================
// JOY ACTIONS — Permission-Gated, Audit-Logged CRUD Operations
// NEVER allows generic table access. Every action is validated.
// ============================================================

export interface ActionPayload {
  table: string;
  data?: Record<string, unknown>;
  id?: string;
  filters?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown> | Record<string, unknown>[] | null;
  error?: string;
}

interface AuditLogEntry {
  user_id: string;
  user_category: string;
  action_type: string;
  target_table: string;
  target_record_id?: string;
  permission_key: string;
  permission_granted: boolean;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Map tables to required permission keys
 */
const TABLE_PERMISSION_MAP: Record<string, string> = {
  timetable: "timetable.manage",
  assignments: "assignments.manage",
  assessments: "grades.manage",
  attendance: "attendance.manage",
  announcements: "content.manage",
  calendar_events: "calendar.manage",
  notifications: "notifications.send",
  messages: "messages.send",
  fee_payments: "fees.manage",
  fee_structures: "fees.manage",
  classes: "students.manage",
  students: "students.manage",
  subjects: "content.manage",
  saved_videos: "content.manage",
  campuses: "admin.access",
};

/**
 * Map tables to view permission keys (for query operations)
 */
const TABLE_VIEW_PERMISSION_MAP: Record<string, string> = {
  timetable: "timetable.view",
  assignments: "assignments.view",
  assessments: "grades.view",
  attendance: "attendance.view",
  announcements: "content.view",
  calendar_events: "calendar.view",
  notifications: "notifications.view",
  messages: "messages.view",
  fee_payments: "fees.view",
  fee_structures: "fees.view",
  classes: "students.view",
  students: "students.view",
  subjects: "content.view",
  saved_videos: "content.view",
  campuses: "admin.access",
};

/**
 * Execute a Joy action with full permission validation and audit logging
 */
export async function executeJoyAction(
  actionType: string,
  actionPayload: ActionPayload,
  userId: string,
  userCategory: string
): Promise<ActionResult> {
  const table = actionPayload.table?.toLowerCase();

  // 1. Validate table is not blacklisted
  if (!table || JOY_BLACKLISTED_TABLES.includes(table)) {
    await logAudit({
      user_id: userId,
      user_category: userCategory,
      action_type: `data_${actionType}`,
      target_table: table || "unknown",
      permission_key: "none",
      permission_granted: false,
      success: false,
      error_message: `Blacklisted or missing table: ${table}`,
    });
    return {
      success: false,
      message: "I cannot access that information.",
      error: "Table access denied",
    };
  }

  // 2. Validate table is whitelisted for user category
  if (!isTableAllowed(table, userCategory)) {
    await logAudit({
      user_id: userId,
      user_category: userCategory,
      action_type: `data_${actionType}`,
      target_table: table,
      permission_key: "none",
      permission_granted: false,
      success: false,
      error_message: `Table ${table} not allowed for ${userCategory}`,
    });
    return {
      success: false,
      message: "You do not have permission to access that data.",
      error: "Permission denied",
    };
  }

  // 3. Check permission
  const permissionKey = actionType === "query" 
    ? (TABLE_VIEW_PERMISSION_MAP[table] || TABLE_PERMISSION_MAP[table])
    : (TABLE_PERMISSION_MAP[table] || `${table}.manage`);

  const hasPerm = await hasPermission(userId, permissionKey);

  if (!hasPerm) {
    await logAudit({
      user_id: userId,
      user_category: userCategory,
      action_type: `data_${actionType}`,
      target_table: table,
      permission_key: permissionKey,
      permission_granted: false,
      success: false,
      error_message: `Missing permission: ${permissionKey}`,
    });
    return {
      success: false,
      message: `You need the "${permissionKey}" permission to perform this action.`,
      error: "Permission denied",
    };
  }

  // 4. Execute the action
  const admin = getSupabaseAdmin();
  let result: ActionResult;

  try {
    switch (actionType) {
      case "create": {
        result = await actionCreate(admin, table, actionPayload);
        break;
      }
      case "update": {
        result = await actionUpdate(admin, table, actionPayload);
        break;
      }
      case "delete": {
        result = await actionDelete(admin, table, actionPayload);
        break;
      }
      case "query": {
        result = await actionQuery(admin, table, actionPayload);
        break;
      }
      default: {
        result = {
          success: false,
          message: `Unknown action type: ${actionType}`,
          error: "Invalid action",
        };
      }
    }
  } catch (err) {
    result = {
      success: false,
      message: getErrorMessage(err),
      error: getErrorMessage(err),
    };
  }

  // 5. Log audit
  await logAudit({
    user_id: userId,
    user_category: userCategory,
    action_type: `data_${actionType}`,
    target_table: table,
    target_record_id: actionPayload.id,
    permission_key: permissionKey,
    permission_granted: true,
    success: result.success,
    error_message: result.error,
    metadata: { filters: actionPayload.filters },
  });

  return result;
}

async function actionCreate(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  payload: ActionPayload
): Promise<ActionResult> {
  if (!payload.data) {
    return { success: false, message: "No data provided for create action" };
  }

  // Sanitize data — remove any id fields to prevent ID injection
  const sanitizedData = { ...payload.data };
  delete sanitizedData.id;
  delete sanitizedData.created_at;

  const { data, error } = await admin
    .from(table)
    .insert([sanitizedData])
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message, error: error.message };
  }

  return {
    success: true,
    message: `Created ${table} record successfully`,
    data: data as Record<string, unknown> | null,
  };
}

async function actionUpdate(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  payload: ActionPayload
): Promise<ActionResult> {
  if (!payload.id || !payload.data) {
    return { success: false, message: "ID and data required for update" };
  }

  // Sanitize — prevent changing critical fields
  const sanitizedData = { ...payload.data };
  delete sanitizedData.id;
  delete sanitizedData.created_at;
  delete sanitizedData.user_id;
  delete sanitizedData.profile_id;

  const { data, error } = await admin
    .from(table)
    .update(sanitizedData)
    .eq("id", payload.id)
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message, error: error.message };
  }

  return {
    success: true,
    message: `Updated ${table} record successfully`,
    data: data as Record<string, unknown> | null,
  };
}

async function actionDelete(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  payload: ActionPayload
): Promise<ActionResult> {
  if (!payload.id) {
    return { success: false, message: "ID required for delete" };
  }

  const { error } = await admin
    .from(table)
    .delete()
    .eq("id", payload.id);

  if (error) {
    return { success: false, message: error.message, error: error.message };
  }

  return {
    success: true,
    message: `Deleted ${table} record successfully`,
  };
}

async function actionQuery(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  payload: ActionPayload
): Promise<ActionResult> {
  let query = admin.from(table).select("*");

  if (payload.filters) {
    for (const [key, value] of Object.entries(payload.filters)) {
      if (value === null || value === undefined) continue;
      if (typeof value === "string" && value.includes("%")) {
        query = query.ilike(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
  }

  // Limit results to prevent data exfiltration
  query = query.limit(50);

  const { data, error } = await query;

  if (error) {
    return { success: false, message: error.message, error: error.message };
  }

  return {
    success: true,
    message: `Retrieved ${(data || []).length} ${table} records`,
    data: data as Record<string, unknown>[],
  };
}

async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    await admin.from("joy_audit_log").insert({
      user_id: entry.user_id,
      user_category: entry.user_category,
      action_type: entry.action_type,
      target_table: entry.target_table,
      target_record_id: entry.target_record_id,
      permission_key: entry.permission_key,
      permission_granted: entry.permission_granted,
      success: entry.success,
      error_message: entry.error_message,
      metadata: entry.metadata || {},
    });
  } catch (err) {
    // Fail silently — audit logging should never block operations
    console.error("[joy-actions] Audit log failed:", getErrorMessage(err));
  }
}
