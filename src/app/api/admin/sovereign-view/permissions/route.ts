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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { data: allPerms } = await admin
      .from("permissions")
      .select("key, name, category")
      .order("category", { ascending: true });

    const { data: userPerms } = await admin
      .from("staff_permissions")
      .select("permission_key")
      .eq("user_id", userId);

    const grantedKeys = new Set((userPerms || []).map((p: Record<string, unknown>) => p.permission_key));

    const permissions = (allPerms || []).map((p: Record<string, unknown>) => ({
      key: p.key,
      name: p.name,
      category: p.category,
      granted: grantedKeys.has(p.key),
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
    const { userId, permissionKey, granted } = body;

    if (!userId || !permissionKey || typeof granted !== "boolean") {
      return NextResponse.json({ error: "userId, permissionKey, and granted required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (granted) {
      const { error } = await admin
        .from("staff_permissions")
        .upsert({ user_id: userId, permission_key: permissionKey }, { onConflict: "user_id,permission_key" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await admin
        .from("staff_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("permission_key", permissionKey);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "PERMISSION_CHANGE",
      table_name: "staff_permissions",
      record_id: userId,
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
