import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hasPermission } from "@/lib/permissions";

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

    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Students, staff, and admins can access VORA
    if (profile.user_category === "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const grade_level = searchParams.get("grade_level");
    const subject = searchParams.get("subject");

    let query = admin.from("vora_content").select("*");
    if (grade_level) query = query.eq("grade_level", grade_level);
    if (subject) query = query.eq("subject", subject);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch VORA content" }, { status: 500 });
    }

    return NextResponse.json({ content: data || [] });
  } catch (error: any) {
    console.error("[api/vora/content] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
