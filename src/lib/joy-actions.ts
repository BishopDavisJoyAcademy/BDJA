import { getSupabaseAdmin } from "./supabase-server";
import { getErrorMessage } from "./errors";

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

export async function executeJoyAction(
  actionType: string,
  actionPayload: ActionPayload
): Promise<ActionResult> {
  const admin = getSupabaseAdmin();

  try {
    switch (actionType) {
      case "create": {
        if (!actionPayload.data) {
          return { success: false, message: "No data provided for create action" };
        }
        const { data, error } = await admin
          .from(actionPayload.table as never)
          .insert([actionPayload.data as never])
          .select()
          .single();
        if (error) return { success: false, message: error.message };
        return {
          success: true,
          message: `Created ${actionPayload.table} record`,
          data: data as Record<string, unknown> | null,
        };
      }

      case "update": {
        if (!actionPayload.id || !actionPayload.data) {
          return { success: false, message: "ID and data required for update" };
        }
        const { data, error } = await admin
          .from(actionPayload.table as never)
          .update(actionPayload.data as never)
          .eq("id", actionPayload.id)
          .select()
          .single();
        if (error) return { success: false, message: error.message };
        return {
          success: true,
          message: `Updated ${actionPayload.table} record`,
          data: data as Record<string, unknown> | null,
        };
      }

      case "delete": {
        if (!actionPayload.id) {
          return { success: false, message: "ID required for delete" };
        }
        const { error } = await admin
          .from(actionPayload.table as never)
          .delete()
          .eq("id", actionPayload.id);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Deleted ${actionPayload.table} record` };
      }

      case "query": {
        let query = admin.from(actionPayload.table as never).select("*");
        if (actionPayload.filters) {
          for (const [key, value] of Object.entries(actionPayload.filters)) {
            query = query.eq(key, value as never);
          }
        }
        const { data, error } = await query;
        if (error) return { success: false, message: error.message };
        return {
          success: true,
          message: `Queried ${actionPayload.table}`,
          data: data as Record<string, unknown>[] | null,
        };
      }

      default:
        return { success: false, message: `Unknown action type: ${actionType}` };
    }
  } catch (err: unknown) {
    return { success: false, message: getErrorMessage(err), error: getErrorMessage(err) };
  }
}
