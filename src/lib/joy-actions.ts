import { getSupabaseAdmin } from "./supabase-server";
import { JoyAction } from "@/types/joy";

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function executeJoyAction(
  userId: string,
  userCategory: string,
  action: JoyAction
): Promise<ActionResult> {
  const admin = getSupabaseAdmin();

  try {
    switch (action.type) {
      case "navigate":
        return { success: true, message: `Navigate to ${action.target}`, data: { path: action.target } };

      case "refresh":
        return { success: true, message: `Refresh ${action.target}`, data: { target: action.target } };

      case "create_record": {
        if (!action.payload?.table) {
          return { success: false, message: "Missing table name", error: "No table specified" };
        }
        const { data, error } = await admin
          .from(action.payload.table)
          .insert(action.payload.data)
          .select()
          .single();
        if (error) throw error;
        return { success: true, message: `Created ${action.payload.table} record`, data };
      }

      case "update_record": {
        if (!action.payload?.table || !action.payload?.id) {
          return { success: false, message: "Missing table or id", error: "Invalid payload" };
        }
        const { data, error } = await admin
          .from(action.payload.table)
          .update(action.payload.data)
          .eq("id", action.payload.id)
          .select()
          .single();
        if (error) throw error;
        return { success: true, message: `Updated ${action.payload.table} record`, data };
      }

      case "delete_record": {
        if (!action.payload?.table || !action.payload?.id) {
          return { success: false, message: "Missing table or id", error: "Invalid payload" };
        }
        const { error } = await admin
          .from(action.payload.table)
          .delete()
          .eq("id", action.payload.id);
        if (error) throw error;
        return { success: true, message: `Deleted ${action.payload.table} record` };
      }

      case "notify": {
        if (!action.payload?.user_id || !action.payload?.message) {
          return { success: false, message: "Missing notification data", error: "Invalid payload" };
        }
        interface NotificationInsertRow {
          user_id: string;
          title: string;
          message: string;
          type: string;
          action_url: string | null;
          is_read: boolean;
        }

        const { error } = await admin.from("notifications").insert({
          user_id: action.payload.user_id,
          title: action.payload.title || "Joy AI",
          message: action.payload.message,
          type: action.payload.type || "info",
          action_url: action.payload.action_url || null,
          is_read: false,
        } as NotificationInsertRow);
        if (error) throw error;
        return { success: true, message: "Notification sent" };
      }

      default:
        return { success: false, message: "Unknown action type", error: `Type: ${action.type}` };
    }
  } catch (err: any) {
    return { success: false, message: err.message, error: err.message };
  }
}

export function getAvailableActions(userCategory: string): string[] {
  const common = ["navigate", "refresh", "export"];

  if (userCategory === "admin") {
    return [...common, "create_record", "update_record", "delete_record", "notify", "open_modal"];
  }

  if (userCategory === "staff") {
    return [...common, "create_record", "update_record", "notify"];
  }

  return common;
}
