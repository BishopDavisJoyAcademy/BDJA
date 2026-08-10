import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getUserPermissions, getAllPermissions, getPermissionCategories } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const [permissions, allPermissions, categories] = await Promise.all([
      getUserPermissions(session.userId),
      getAllPermissions(),
      getPermissionCategories(),
    ]);

    return NextResponse.json({ permissions, allPermissions, categories });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[api/auth/permissions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
