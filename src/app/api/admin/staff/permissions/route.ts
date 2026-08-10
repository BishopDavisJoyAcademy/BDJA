import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { grantPermissions, getAllPermissions, getPermissionCategories } from "@/lib/permissions";
import { logPermissionChange } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const [allPermissions, categories] = await Promise.all([
      getAllPermissions(),
      getPermissionCategories(),
    ]);

    return NextResponse.json({ permissions: allPermissions, categories });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[permissions GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const body = await req.json();
    const { profileId, permissionIds } = body;

    if (!profileId || !Array.isArray(permissionIds)) {
      return NextResponse.json({ error: "profileId and permissionIds required" }, { status: 400 });
    }

    const result = await grantPermissions(profileId, permissionIds, session.userId);

    if (result.success) {
      await logPermissionChange(session.userId, profileId, result.added, result.removed, getClientIP(req));
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[permissions POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update permissions" }, { status: 500 });
  }
}
