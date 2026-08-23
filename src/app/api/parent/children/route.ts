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

    const { data: profileRows } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .limit(1);
    const profile = (profileRows?.[0] ?? null) as { user_category: string } | null;

    if (!profile || profile.user_category !== "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: children, error } = await admin
      .from("parent_students")
      .select("student_id, relationship, students(*, profiles(full_name, email, phone))")
      .eq("parent_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
    }

    return NextResponse.json({ children: children || [] });
  } catch (error: unknown) {
    console.error("[api/parent/children] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
