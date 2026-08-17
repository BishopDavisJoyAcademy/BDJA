import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || session.userId;
    const category = searchParams.get("category") || session.userCategory;

    if (category === "staff" || category === "admin") {
      const { data, error } = await admin
        .from("staff")
        .select("department, designation")
        .eq("id", id)
        .maybeSingle();
      if (error) return NextResponse.json({ error: "Failed to fetch staff data" }, { status: 500 });
      return NextResponse.json({
        department: data?.department || null,
        designation: data?.designation || null,
        grade_level: null,
        admission_number: null,
      });
    }

    if (category === "student") {
      const { data, error } = await admin
        .from("students")
        .select("grade_level, admission_number")
        .eq("id", id)
        .maybeSingle();
      if (error) return NextResponse.json({ error: "Failed to fetch student data" }, { status: 500 });
      return NextResponse.json({
        department: null,
        designation: null,
        grade_level: data?.grade_level || null,
        admission_number: data?.admission_number || null,
      });
    }

    return NextResponse.json({
      department: null,
      designation: null,
      grade_level: null,
      admission_number: null,
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
