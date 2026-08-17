import { getSupabaseAdmin } from "./supabase-server";
import { Permission, PermissionCategory } from "@/types";

export async function getUserPermissions(userId: string): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("staff_permissions")
    .select("permissions(key)")
    .eq("profile_id", userId);

  if (error || !data) return [];

  return (data as Array<{ permissions: { key: string } | null }>)
    .map((p) => p.permissions?.key)
    .filter((k): k is string => Boolean(k));
}

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return perms.includes(permissionKey);
}

export async function getAllPermissions(): Promise<Permission[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("permissions")
    .select("id, key, name, category, description")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as Permission[];
}

export async function getPermissionCategories(): Promise<PermissionCategory[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("permission_categories")
    .select("id, key, name, icon, sort_order")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PermissionCategory[];
}

export async function grantPermissions(
  profileId: string,
  permissionIds: string[],
  grantedBy: string
): Promise<{ success: boolean; added: string[]; removed: string[] }> {
  const admin = getSupabaseAdmin();

  const { data: current } = await admin
    .from("staff_permissions")
    .select("permission_id")
    .eq("profile_id", profileId);

  const currentIds = new Set((current || []).map((c) => c.permission_id));
  const newIds = new Set(permissionIds);

  const added = permissionIds.filter((id) => !currentIds.has(id));
  const removed = (current || [])
    .filter((c) => !newIds.has(c.permission_id))
    .map((c) => c.permission_id);

  if (added.length > 0) {
    await admin.from("staff_permissions").insert(
      added.map((id) => ({
        profile_id: profileId,
        permission_id: id,
        granted_by: grantedBy,
        created_at: new Date().toISOString(),
      }))
    );
  }

  if (removed.length > 0) {
    await admin
      .from("staff_permissions")
      .delete()
      .eq("profile_id", profileId)
      .in("permission_id", removed);
  }

  const { data: permData } = await admin
    .from("permissions")
    .select("id, key")
    .in("id", [...added, ...removed]);

  const keyMap = new Map<string, string>(
    (permData || []).map((p: { id: string; key: string }) => [p.id, p.key])
  );

  return {
    success: true,
    added: added.map((id) => keyMap.get(id) || id),
    removed: removed.map((id) => keyMap.get(id) || id),
  };
}
