import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "permissions.view");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "profileId required" }, { status: 400 });
    }

    // Get all permissions with their UUIDs
    const { data: allPerms } = await admin
      .from("permissions")
      .select("id, key, name, category")
      .order("category", { ascending: true });

    // Get user's granted permission UUIDs
    const { data: userPerms } = await admin
      .from("staff_permissions")
      .select("permission_id")
      .eq("profile_id", profileId);

    const grantedIds = new Set((userPerms || []).map((p: Record<string, unknown>) => p.permission_id));

    const permissions = (allPerms || []).map((p: Record<string, unknown>) => ({
      key: p.key,
      name: p.name,
      category: p.category,
      granted: grantedIds.has(p.id),
    }));

    return NextResponse.json({ permissions });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "permissions.edit");

    const body = await req.json();
    const { profileId, permissionKey, granted } = body;

    if (!profileId || !permissionKey || typeof granted !== "boolean") {
      return NextResponse.json({ error: "profileId, permissionKey, and granted required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Look up permission UUID from key
    const { data: permRow, error: permErr } = await admin
      .from("permissions")
      .select("id")
      .eq("key", permissionKey)
      .single();

    if (permErr || !permRow) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    const permissionId = permRow.id;

    if (granted) {
      const { error } = await admin
        .from("staff_permissions")
        .upsert(
          { profile_id: profileId, permission_id: permissionId, granted_by: session.userId },
          { onConflict: "profile_id,permission_id" }
        );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await admin
        .from("staff_permissions")
        .delete()
        .eq("profile_id", profileId)
        .eq("permission_id", permissionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "PERMISSION_CHANGE",
      table_name: "staff_permissions",
      record_id: profileId,
      new_data: { permissionKey, granted },
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
