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
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  try {
    // Delete existing permissions for this staff member
    await admin.from("staff_permissions").delete().eq("profile_id", profileId);
    // Insert new permissions
    if (permissionIds.length > 0) {
      const rows = permissionIds.map((pid) => ({
        profile_id: profileId,
        permission_id: pid,
        granted_by: grantedBy,
      }));
      const { error } = await admin.from("staff_permissions").insert(rows);
      if (error) throw error;
    }
    return true;
  } catch (err: any) {
    console.error("[permissions] Failed to grant permissions:", err);
    return false;
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

// Legacy compatibility: route-based permission checks
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["staff.manage"],
  "/admin/users": ["staff.manage"],
  "/admin/analytics": ["analytics.view"],
  "/admin/audit": ["audit.view"],
  "/admin/staff": ["staff.manage"],
  "/admin/students": ["students.manage"],
  "/admin/subjects": ["settings.manage"],
  "/admin/content": ["staff.manage"],
  "/admin/campuses": ["settings.manage"],
  "/admin/pages": ["pages.edit"],
  "/fees": ["fees.view"],
  "/library": ["library.view"],
  "/teacher": ["grades.manage"],
  "/grades": ["grades.view"],
  "/attendance": ["attendance.view"],
  "/timetable": ["timetable.view"],
  "/assignments": ["assignments.view"],
  "/admissions": ["admissions.view"],
  "/manage/admissions": ["admissions.manage"],
  "/manage/calendar": ["calendar.manage"],
  "/manage/library": ["library.manage"],
  "/manage/vora": ["vora.manage"],
  "/vora": ["vora.view"],
  "/calendar": ["calendar.view"],
  "/messages": ["messages.send"],
  "/parent": ["students.view"],
  "/student": ["students.view"],
};

export async function getRequiredPermission(pathname: string): Promise<string[] | null> {
  for (const [route, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) return perms;
  }
  return null;
}

export async function checkRoutePermission(userId: string, pathname: string): Promise<boolean> {
  const required = await getRequiredPermission(pathname);
  if (!required || required.length === 0) return true;
  for (const perm of required) {
    if (await hasPermission(userId, perm)) return true;
  }
  return false;
}
