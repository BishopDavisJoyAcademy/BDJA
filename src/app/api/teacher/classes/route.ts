import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface ClassRecord {
  id: string;
  name: string;
  grade_level: string;
  stream: string | null;
  academic_year: string;
  campus_id: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");

    let query = admin.from("classes").select("*");
    if (teacherId) {
      const { data: assignments } = await admin
        .from("teacher_registers")
        .select("class_id")
        .eq("teacher_id", teacherId);
      const classIds = (assignments || []).map((a) => a.class_id).filter(Boolean);
      if (classIds.length > 0) query = query.in("id", classIds);
    }

    const { data, error } = await query.order("name", { ascending: true });
    if (error) return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });

    const classMap = new Map<string, ClassRecord>();
    for (const c of (data || [])) {
      const record = c as ClassRecord;
      if (record && record.id && !classMap.has(record.id)) {
        classMap.set(record.id, record);
      }
    }

    return NextResponse.json({ classes: Array.from(classMap.values()) });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
