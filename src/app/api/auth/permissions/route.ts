import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getAllPermissions, getPermissionCategories } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const [allPermissions, categories] = await Promise.all([
      getAllPermissions(),
      getPermissionCategories(),
    ]);

    return NextResponse.json({
      permissions: allPermissions,
      categories,
      userPermissions: session.permissions,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[permissions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
