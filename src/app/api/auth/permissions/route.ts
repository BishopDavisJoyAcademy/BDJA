import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getUserPermissions, getAllPermissions, getPermissionCategories } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const [permissions, allPermissions, categories] = await Promise.all([
      getUserPermissions(user.id),
      getAllPermissions(),
      getPermissionCategories(),
    ]);

    return NextResponse.json({ permissions, allPermissions, categories });
  } catch (error: any) {
    console.error("[api/auth/permissions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
