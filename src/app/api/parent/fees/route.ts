import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("child");

    if (!childId) {
      return NextResponse.json({ error: "Child ID required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: link } = await admin
      .from("parent_students")
      .select("id")
      .eq("parent_id", session.userId)
      .eq("student_id", childId)
      .single();

    if (!link) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: child } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", childId)
      .single();

    const { data: payments, error: payError } = await admin
      .from("payments")
      .select("*, fee_structures(grade_level, term, academic_year)")
      .eq("student_id", childId)
      .order("created_at", { ascending: false });

    if (payError) {
      return NextResponse.json({ error: payError.message }, { status: 500 });
    }

    const totalPaid = (payments || []).filter((p: { status: string; amount: number }) => p.status === "verified").reduce((s: number, p: { amount: number }) => s + p.amount, 0);
    const totalPending = (payments || []).filter((p: { status: string; amount: number }) => p.status === "pending").reduce((s: number, p: { amount: number }) => s + p.amount, 0);

    return NextResponse.json({
      payments: payments || [],
      child_name: child?.full_name || "",
      total_paid: totalPaid,
      total_pending: totalPending,
    });
  } catch (error: any) {
    console.error("[api/parent/fees] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
