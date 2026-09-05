import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("child_id");

    if (!childId) {
      return NextResponse.json({ error: "child_id is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify parent access
    const { data: authCheck } = await admin
      .from("parent_children")
      .select("id")
      .eq("parent_id", session.userId)
      .eq("student_id", childId)
      .limit(1);

    let authorized = (authCheck && authCheck.length > 0);
    if (!authorized) {
      const { data: legacyCheck } = await admin
        .from("parent_students")
        .select("id")
        .eq("parent_id", session.userId)
        .eq("student_id", childId)
        .limit(1);
      authorized = (legacyCheck && legacyCheck.length > 0);
    }

    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get fee payments for this child
    const { data: payments, error } = await admin
      .from("fee_payments")
      .select(`
        *,
        fee_structures:fee_structure_id(grade_level, term, academic_year, tuition, activity_fees, transport, uniform, total)
      `)
      .eq("student_id", childId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/parent/fees] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch fees" }, { status: 500 });
    }

    // Get student's grade level for fee structure lookup
    const { data: studentRow } = await admin
      .from("students")
      .select("grade_level")
      .eq("id", childId)
      .maybeSingle();

    // Get applicable fee structure
    let feeStructure = null;
    if (studentRow?.grade_level) {
      const currentYear = new Date().getFullYear().toString();
      const { data: fs } = await admin
        .from("fee_structures")
        .select("*")
        .eq("grade_level", studentRow.grade_level)
        .eq("academic_year", currentYear)
        .maybeSingle();
      feeStructure = fs;
    }

    // Calculate totals
    const totalPaid = (payments || []).reduce((sum: number, p: Record<string, unknown>) => sum + (p.amount as number || 0), 0);
    const totalExpected = feeStructure?.total || 0;
    const balance = Math.max(0, totalExpected - totalPaid);

    return NextResponse.json({
      payments: payments || [],
      fee_structure: feeStructure,
      total_paid: totalPaid,
      total_expected: totalExpected,
      balance,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/fees] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
