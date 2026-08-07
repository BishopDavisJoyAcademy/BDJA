import { UserCategory } from "@/types";
import { getSupabaseAdmin } from "./supabase-server";

export interface PermissionSet {
  [key: string]: boolean;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .rpc("get_user_permissions", { p_user_id: userId });
  if (error || !data) {
    console.error("[permissions] Failed to fetch permissions:", error);
    return [];
  }
  return data.map((p: any) => p.permission_key);
}

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .rpc("has_permission", { p_user_id: userId, p_permission_key: permissionKey });
  if (error) {
    console.error("[permissions] has_permission RPC failed:", error);
    return false;
  }
  return data === true;
}

export async function getAllPermissions() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("permissions")
    .select("*, permission_categories(name, icon, sort_order)")
    .order("category", { ascending: true });
  if (error) {
    console.error("[permissions] Failed to fetch all permissions:", error);
    return [];
  }
  return data || [];
}

export async function getPermissionCategories() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("permission_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[permissions] Failed to fetch categories:", error);
    return [];
  }
  return data || [];
}

export async function grantPermissions(
  profileId: string,
  permissionIds: string[],
  grantedBy: string
): Promise<{ success: boolean; added: string[] }> {
  const admin = getSupabaseAdmin();
  try {
    // Get current permissions
    const { data: current } = await admin
      .from("staff_permissions")
      .select("permission_id")
      .eq("profile_id", profileId);
    const currentIds = new Set((current || []).map((c: any) => c.permission_id));

    // Determine added/removed
    const newIds = new Set(permissionIds);
    const added = permissionIds.filter((id) => !currentIds.has(id));
    const removed = (current || []).filter((c: any) => !newIds.has(c.permission_id)).map((c: any) => c.permission_id);

    // Delete existing
    await admin.from("staff_permissions").delete().eq("profile_id", profileId);

    // Insert new
    if (permissionIds.length > 0) {
      const rows = permissionIds.map((pid) => ({
        profile_id: profileId,
        permission_id: pid,
        granted_by: grantedBy,
      }));
      const { error } = await admin.from("staff_permissions").insert(rows);
      if (error) throw error;
    }

    // Get permission keys for audit
    const { data: permData } = await admin
      .from("permissions")
      .select("id, key")
      .in("id", [...added, ...removed]);
    const keyMap = new Map((permData || []).map((p: any) => [p.id, p.key]));

    return {
      success: true,
      added: added.map((id) => keyMap.get(id) || id),
    };
  } catch (err: any) {
    console.error("[permissions] Failed to grant permissions:", err);
    return { success: false, added: [] };
  }
}

export async function revokeAllPermissions(profileId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  try {
    await admin.from("staff_permissions").delete().eq("profile_id", profileId);
    return true;
  } catch (err: any) {
    console.error("[permissions] Failed to revoke permissions:", err);
    return false;
  }
}

// Route permissions map
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["admin.access"],
  "/admin/users": ["admin.access"],
  "/admin/analytics": ["analytics.view"],
  "/admin/audit": ["audit.view"],
  "/admin/staff": ["staff.manage"],
  "/admin/students": ["students.manage"],
  "/admin/subjects": ["settings.manage"],
  "/admin/content": ["content.manage"],
  "/admin/campuses": ["settings.manage"],
  "/admin/pages": ["pages.edit"],
  "/admin/setup": ["admin.access"],
  "/admin/god-mode": ["impersonate.users"],
  "/admin/suggestions": ["suggestions.manage"],
  "/teacher": ["grades.view", "attendance.view", "timetable.view"],
  "/teacher/marks": ["grades.manage"],
  "/teacher/registers": ["attendance.manage"],
  "/teacher/timetables": ["timetable.manage"],
  "/fees": ["fees.view", "fees.manage"],
  "/library": ["library.view", "library.manage"],
  "/grades": ["grades.view", "grades.manage"],
  "/attendance": ["attendance.view", "attendance.manage"],
  "/timetable": ["timetable.view", "timetable.manage"],
  "/assignments": ["assignments.view", "assignments.manage"],
  "/admissions": ["admissions.view", "admissions.manage"],
  "/manage/admissions": ["admissions.manage"],
  "/manage/calendar": ["calendar.manage"],
  "/manage/library": ["library.manage"],
  "/manage/vora": ["vora.manage"],
  "/vora": ["vora.view", "vora.manage"],
  "/calendar": ["calendar.view", "calendar.manage"],
  "/messages": ["messages.send"],
  "/student": [],
  "/student/parent": [],
};

export async function getRequiredPermission(pathname: string): Promise<string[] | null> {
  for (const [route, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) return perms;
  }
  return null;
}

export async function checkRoutePermission(
  userId: string,
  pathname: string,
  userCategory?: string
): Promise<boolean> {
  if (userCategory === "admin") return true;
  if (userCategory === "student" && pathname.startsWith("/student")) return true;
  if (userCategory === "parent" && pathname.startsWith("/student")) return true;

  const required = await getRequiredPermission(pathname);
  if (!required || required.length === 0) return true;

  for (const perm of required) {
    if (await hasPermission(userId, perm)) return true;
  }
  return false;
}
