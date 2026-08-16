import { getSupabaseAdmin } from "./supabase-server";

export interface Permission {
  id: string;
  permission_key: string;
  name: string;
  category: string;
  description: string | null;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("staff_permissions")
    .select("permissions(permission_key)")
    .eq("staff_id", userId);

  if (error || !data) return [];

  return (data as Array<{ permissions: { permission_key: string } | null }>)
    .map((p) => p.permissions?.permission_key)
    .filter((k): k is string => Boolean(k));
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
    .eq("staff_id", profileId);

  const currentIds = new Set((current || []).map((c) => c.permission_id));
  const newIds = new Set(permissionIds);

  const added = permissionIds.filter((id) => !currentIds.has(id));
  const removed = (current || [])
    .filter((c) => !newIds.has(c.permission_id))
    .map((c) => c.permission_id);

  if (added.length > 0) {
    await admin.from("staff_permissions").insert(
      added.map((id) => ({
        staff_id: profileId,
        permission_id: id,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
      }))
    );
  }

  if (removed.length > 0) {
    await admin
      .from("staff_permissions")
      .delete()
      .eq("staff_id", profileId)
      .in("permission_id", removed);
  }

  const { data: permData } = await admin
    .from("permissions")
    .select("id, permission_key")
    .in("id", [...added, ...removed]);

  const keyMap = new Map<string, string>(
    (permData || []).map((p: { id: string; permission_key: string }) => [p.id, p.permission_key])
  );

  return {
    success: true,
    added: added.map((id) => keyMap.get(id) || id),
    removed: removed.map((id) => keyMap.get(id) || id),
  };
}
