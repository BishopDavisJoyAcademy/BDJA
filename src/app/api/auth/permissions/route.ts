import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getUserPermissions, getAllPermissions, getPermissionCategories } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPerms = await getUserPermissions(session.userId);
    const allPerms = await getAllPermissions();
    const categories = await getPermissionCategories();

    return NextResponse.json({
      permissions: userPerms,
      allPermissions: allPerms,
      categories,
    });
  } catch (error: any) {
    console.error("[api/auth/permissions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
