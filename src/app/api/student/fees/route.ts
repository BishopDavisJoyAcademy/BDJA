import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paymentClaimSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  payment_method: z.enum(["mpesa", "cash", "bank_transfer", "cheque", "card", "other"]),
  transaction_ref: z.string().min(5, "Transaction reference is required").max(50),
  phone_number: z.string().min(10, "Valid phone number required").max(15),
  payment_date: z.string().min(1, "Payment date is required"),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    // Find the student record for this user
    const { data: studentRow } = await admin
      .from("students")
      .select("id, grade_level, class_id")
      .eq("profile_id", session.userId)
      .maybeSingle();

    if (!studentRow) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const studentId = studentRow.id;

    // Get fee payments
    const { data: payments, error: payError } = await admin
      .from("fee_payments")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (payError) {
      console.error("[api/student/fees] payments error:", payError);
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }

    // Get applicable fee structure
    const currentYear = new Date().getFullYear().toString();
    let feeStructure = null;
    if (studentRow.grade_level) {
      const { data: fs } = await admin
        .from("fee_structures")
        .select("*")
        .eq("grade_level", studentRow.grade_level)
        .eq("academic_year", currentYear)
        .maybeSingle();
      feeStructure = fs;
    }

    // Calculate totals
    const totalPaid = (payments || []).reduce((sum: number, p: Record<string, unknown>) => sum + ((p.amount as number) || 0), 0);
    const totalExpected = (feeStructure?.total as number) || 0;
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
    console.error("[api/student/fees] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const parseResult = paymentClaimSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { amount, payment_method, transaction_ref, phone_number, payment_date, notes } = parseResult.data;

    // Find student record
    const { data: studentRow } = await admin
      .from("students")
      .select("id, grade_level")
      .eq("profile_id", session.userId)
      .maybeSingle();

    if (!studentRow) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Get applicable fee structure for fee_structure_id
    const currentYear = new Date().getFullYear().toString();
    let feeStruct = null;
    if (studentRow.grade_level) {
      const { data: fs } = await admin
        .from("fee_structures")
        .select("id")
        .eq("grade_level", studentRow.grade_level)
        .eq("academic_year", currentYear)
        .maybeSingle();
      feeStruct = fs;
    }

    // Check for duplicate transaction ref
    const { data: existing } = await admin
      .from("fee_payments")
      .select("id")
      .eq("transaction_ref", transaction_ref)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "This transaction reference has already been submitted" }, { status: 409 });
    }

    const insertData = {
      student_id: studentRow.id,
      amount,
      payment_method,
      transaction_ref,
      status: "pending" as const,
      notes: notes || `Phone: ${phone_number}, Date: ${payment_date}`,
      ...(feeStruct?.id ? { fee_structure_id: feeStruct.id } : {}),
    };

    const { data, error } = await admin
      .from("fee_payments")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[api/student/fees POST] Supabase error:", error);
      return NextResponse.json({ error: "Failed to submit payment claim" }, { status: 500 });
    }

    // TODO: Send notification to admin/staff when notifications table supports broadcast
    // For now, payment claims are visible in admin dashboard via fee_payments.status = "pending"

    return NextResponse.json({ success: true, claim: data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/student/fees POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
