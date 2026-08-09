import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

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

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    if (!staffId) {
      return NextResponse.json({ error: "staffId required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("staff_permissions")
      .select("permission_id, permissions(id, key, name, category)")
      .eq("profile_id", staffId);

    if (error) {
      console.error("[staff permissions GET] error:", error);
      return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
    }

    return NextResponse.json({ permissions: data || [] });
  } catch (error: any) {
    console.error("[staff permissions GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
