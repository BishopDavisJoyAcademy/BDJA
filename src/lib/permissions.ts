import { getSupabaseAdmin } from "./supabase-server";

export async function getUserPermissions(userId: string): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_user_permissions", { p_user_id: userId });
  if (error || !data) {
    console.error("[permissions] Failed to fetch permissions:", error);
    return [];
  }
  return data.map((p: any) => p.permission_key || p);
}

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("has_permission", { p_user_id: userId, p_permission_key: permissionKey });
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
  const { data, error } = await admin.from("permission_categories").select("*").order("sort_order", { ascending: true });
  if (error) {
    console.error("[permissions] Failed to fetch categories:", error);
    return [];
  }
  return data || [];
}

export async function grantPermissions(profileId: string, permissionIds: string[], grantedBy: string): Promise<{ success: boolean; added: string[]; removed: string[] }> {
  const admin = getSupabaseAdmin();
  try {
    // Verify granter can only grant permissions they themselves have
    const { data: granterPerms } = await admin.rpc("get_user_permissions", { p_user_id: grantedBy });
    const granterPermSet = new Set((granterPerms || []).map((p: any) => p.permission_key || p));
    const isAdmin = await admin.rpc("has_permission", { p_user_id: grantedBy, p_permission_key: "admin.access" });

    // Get current permissions
    const { data: current } = await admin.from("staff_permissions").select("permission_id").eq("profile_id", profileId);
    const currentIds = new Set((current || []).map((c: any) => c.permission_id));

    const newIds = new Set(permissionIds);
    const added = permissionIds.filter((id) => !currentIds.has(id));
    const removed = (current || []).filter((c: any) => !newIds.has(c.permission_id)).map((c: any) => c.permission_id);

    // Validate granter authority for added permissions
    if (!isAdmin && added.length > 0) {
      const { data: addedPermKeys } = await admin.from("permissions").select("id, key").in("id", added);
      for (const perm of addedPermKeys || []) {
        if (!granterPermSet.has(perm.key)) {
          throw new Error(`You do not have permission to grant '${perm.key}'`);
        }
      }
    }

    // Atomic replace
    await admin.from("staff_permissions").delete().eq("profile_id", profileId);
    if (permissionIds.length > 0) {
      const rows = permissionIds.map((pid) => ({ profile_id: profileId, permission_id: pid, granted_by: grantedBy }));
      const { error } = await admin.from("staff_permissions").insert(rows);
      if (error) throw error;
    }

    const { data: permData } = await admin.from("permissions").select("id, key").in("id", [...added, ...removed]);
    const keyMap = new Map<string, string>((permData || []).map((p: any) => [p.id, p.key]));

    return { success: true, added: added.map((id) => keyMap.get(id) || id), removed: removed.map((id) => keyMap.get(id) || id) };
  } catch (err: any) {
    console.error("[permissions] Failed to grant permissions:", err);
    return { success: false, added: [], removed: [] };
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

// Route permission map — enforced in middleware AND API routes
export import { ADMIN_SEGMENT } from "./constants";

function buildRoutePermissions(): Record<string, string[]> {
  const A = `/${ADMIN_SEGMENT}`;
  return {
    // Admin routes
    [A]: ["admin.access"],
    [`${A}/users`]: ["admin.access"],
    [`${A}/analytics`]: ["analytics.view"],
    [`${A}/audit`]: ["audit.view"],
    [`${A}/staff`]: ["staff.manage"],
    [`${A}/students`]: ["students.manage"],
    [`${A}/subjects`]: ["settings.manage"],
    [`${A}/content`]: ["content.manage"],
    [`${A}/campuses`]: ["settings.manage"],
    [`${A}/pages`]: ["pages.edit"],
    [`${A}/setup`]: ["admin.access"],
    [`${A}/god-mode`]: ["impersonate.users"],
    [`${A}/suggestions`]: ["suggestions.manage"],

export function getRequiredPermissions(pathname: string): string[] | null {
  for (const [route, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + "/")) return perms;
  }
  return null;
}

export function checkRoutePermission(session: { userCategory: string; permissions: string[] }, pathname: string): boolean {
  if (session.userCategory === "admin") return true;
  if (session.userCategory === "student" && pathname.startsWith("/student")) return true;
  if (session.userCategory === "parent" && (pathname.startsWith("/parent") || pathname.startsWith("/student"))) return true;

  const required = getRequiredPermissions(pathname);
  if (!required || required.length === 0) return true;
  return required.some((perm) => session.permissions.includes(perm));
}
