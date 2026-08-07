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

    const { data: profile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .single();

    if (!profile || profile.user_category !== "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: children } = await admin
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", user.id);

    const studentIds = (children || []).map((c: any) => c.student_id);
    if (studentIds.length === 0) {
      return NextResponse.json({ fees: [] });
    }

    const { data: fees, error } = await admin
      .from("fee_payments")
      .select("*, students(admission_number, profiles(full_name))")
      .in("student_id", studentIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch fees" }, { status: 500 });
    }

    return NextResponse.json({ fees: fees || [] });
  } catch (error: any) {
    console.error("[api/parent/fees] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
