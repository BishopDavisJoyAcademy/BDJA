import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";
import { Json } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const studentId = searchParams.get("student_id");
    const gradeFilter = searchParams.get("grade");
    const campusFilter = searchParams.get("campus");
    const yearFilter = searchParams.get("year");
    const termFilter = searchParams.get("term");
    const withPayments = searchParams.get("payments") === "true";
    const withReminders = searchParams.get("reminders") === "true";

    if (id) {
      const { data: feeStructure, error } = await admin
        .from("fee_structures")
        .select("*, campuses(name)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[fees GET] Single fetch error:", error.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      if (!feeStructure) {
        return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
      }

      let payments = null;
      let reminders = null;

      if (withPayments) {
        const { data: paymentsData } = await admin
          .from("fee_payments")
          .select("*, profiles!fee_payments_student_id_fkey(full_name)")
          .eq("fee_structure_id", id)
          .order("created_at", { ascending: false });
        payments = paymentsData || [];
      }

      if (withReminders) {
        const { data: remindersData } = await admin
          .from("fee_reminders")
          .select("*, profiles!fee_reminders_student_id_fkey(full_name)")
          .eq("fee_structure_id", id)
          .order("created_at", { ascending: false });
        reminders = remindersData || [];
      }

      return NextResponse.json({ feeStructure, payments, reminders });
    }

    if (studentId) {
      // Get all fee structures applicable to this student + their payments
      const { data: student } = await admin
        .from("students")
        .select("grade_level, class_id")
        .eq("id", studentId)
        .maybeSingle();

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      if (!student.grade_level) {
        return NextResponse.json({ feeStructures: [], payments: [] });
      }

      const { data: feeStructures } = await admin
        .from("fee_structures")
        .select("*")
        .eq("grade_level", student.grade_level);

      const { data: payments } = await admin
        .from("fee_payments")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      return NextResponse.json({
        feeStructures: feeStructures || [],
        payments: payments || [],
      });
    }

    let query = admin
      .from("fee_structures")
      .select("*, campuses(name)")
      .order("created_at", { ascending: false });

    if (gradeFilter && gradeFilter !== "all") {
      query = query.eq("grade_level", gradeFilter);
    }
    if (campusFilter && campusFilter !== "all") {
      query = query.eq("campus_id", campusFilter);
    }
    if (yearFilter && yearFilter !== "all") {
      query = query.eq("academic_year", yearFilter);
    }
    if (termFilter && termFilter !== "all") {
      query = query.eq("term", termFilter);
    }

    const { data: feeStructures, error } = await query;

    if (error) {
      console.error("[fees GET] List fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch fee structures" }, { status: 500 });
    }

    return NextResponse.json({ feeStructures: feeStructures || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[fees GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action || "create_structure";

    if (action === "record_payment") {
      return handleRecordPayment(body, session, req);
    }
    if (action === "send_reminder") {
      return handleSendReminder(body, session, req);
    }
    if (action !== "create_structure") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return handleCreateStructure(body, session, req);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 400 });
    }
    console.error("[fees POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleCreateStructure(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const gradeLevel = String(body.grade_level || "").trim();
  const campusId = String(body.campus_id || "").trim();
  const academicYear = String(body.academic_year || "").trim();
  const term = String(body.term || "").trim();
  const tuition = Number(body.tuition || 0);
  const transport = body.transport ? Number(body.transport) : null;
  const activityFees = body.activity_fees ? Number(body.activity_fees) : null;
  const uniform = body.uniform ? Number(body.uniform) : null;
  const otherFees = body.other_fees || null;

  if (!gradeLevel) throw new ValidationError("Grade level is required");
  if (!campusId) throw new ValidationError("Campus is required");
  if (!academicYear) throw new ValidationError("Academic year is required");
  if (!term) throw new ValidationError("Term is required");
  if (tuition < 0) throw new ValidationError("Tuition cannot be negative");

  const total = tuition + (transport || 0) + (activityFees || 0) + (uniform || 0);

  const { data, error } = await admin.from("fee_structures").insert({
    grade_level: gradeLevel,
    campus_id: campusId,
    academic_year: academicYear,
    term,
    tuition,
    transport,
    activity_fees: activityFees,
    uniform,
    other_fees: otherFees as Json,
    total,
    created_by: session.userId,
  }).select().single();

  if (error) {
    console.error("[fees POST] Create error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create fee structure" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "FEE_STRUCTURE_CREATED",
    table_name: "fee_structures",
    record_id: data.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, feeStructure: data });
}

async function handleRecordPayment(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const studentId = String(body.student_id || "");
  const feeStructureId = body.fee_structure_id ? String(body.fee_structure_id) : null;
  const amount = Number(body.amount || 0);
  const paymentMethod = String(body.payment_method || "").trim();
  const notes = body.notes ? String(body.notes) : null;
  const receiptNumber = body.receipt_number ? String(body.receipt_number) : null;

  if (!studentId) throw new ValidationError("Student ID is required");
  if (amount <= 0) throw new ValidationError("Amount must be greater than zero");
  if (!paymentMethod) throw new ValidationError("Payment method is required");

  // Verify student exists
  const { data: student } = await admin.from("students").select("id").eq("id", studentId).maybeSingle();
  if (!student) throw new ValidationError("Student not found");

  const { data, error } = await admin.from("fee_payments").insert({
    student_id: studentId,
    fee_structure_id: feeStructureId,
    amount,
    payment_method: paymentMethod,
    notes,
    receipt_number: receiptNumber,
    status: "verified",
    verified_by: session.userId,
    verified_at: new Date().toISOString(),
  }).select().single();

  if (error) {
    console.error("[fees POST] Payment record error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "FEE_PAYMENT_RECORDED",
    table_name: "fee_payments",
    record_id: data.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, payment: data });
}

async function handleSendReminder(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const feeStructureId = String(body.fee_structure_id || "");
  const studentId = String(body.student_id || "");
  const reminderType = String(body.reminder_type || "upcoming");
  const message = String(body.message || "").trim();

  if (!feeStructureId) throw new ValidationError("Fee structure ID is required");
  if (!studentId) throw new ValidationError("Student ID is required");
  if (!message) throw new ValidationError("Message is required");

  const { data, error } = await admin.from("fee_reminders").insert({
    fee_structure_id: feeStructureId,
    student_id: studentId,
    reminder_type: reminderType,
    message,
    status: "sent",
    sent_at: new Date().toISOString(),
    sent_by: session.userId,
  }).select().single();

  if (error) {
    console.error("[fees POST] Reminder error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to send reminder" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "FEE_REMINDER_SENT",
    table_name: "fee_reminders",
    record_id: data.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, reminder: data });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Fee structure ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: existing } = await admin.from("fee_structures").select("*").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });

    const updateData: {
      grade_level?: string;
      campus_id?: string;
      academic_year?: string;
      term?: string;
      tuition?: number;
      transport?: number | null;
      activity_fees?: number | null;
      uniform?: number | null;
      other_fees?: Json;
      total?: number;
    } = {};

    if (updates.grade_level !== undefined) updateData.grade_level = String(updates.grade_level).trim();
    if (updates.campus_id !== undefined) updateData.campus_id = String(updates.campus_id).trim();
    if (updates.academic_year !== undefined) updateData.academic_year = String(updates.academic_year).trim();
    if (updates.term !== undefined) updateData.term = String(updates.term).trim();
    if (updates.tuition !== undefined) updateData.tuition = Number(updates.tuition);
    if (updates.transport !== undefined) updateData.transport = updates.transport ? Number(updates.transport) : null;
    if (updates.activity_fees !== undefined) updateData.activity_fees = updates.activity_fees ? Number(updates.activity_fees) : null;
    if (updates.uniform !== undefined) updateData.uniform = updates.uniform ? Number(updates.uniform) : null;
    if (updates.other_fees !== undefined) updateData.other_fees = updates.other_fees as Json;

    // Recalculate total
    const tuition = updateData.tuition !== undefined ? updateData.tuition : existing.tuition;
    const transport = updateData.transport !== undefined ? updateData.transport : existing.transport;
    const activityFees = updateData.activity_fees !== undefined ? updateData.activity_fees : existing.activity_fees;
    const uniform = updateData.uniform !== undefined ? updateData.uniform : existing.uniform;
    updateData.total = tuition + (transport || 0) + (activityFees || 0) + (uniform || 0);

    const { error } = await admin.from("fee_structures").update(updateData).eq("id", id);

    if (error) {
      console.error("[fees PATCH] Update error:", error.message);
      return NextResponse.json({ error: "Failed to update fee structure" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "FEE_STRUCTURE_UPDATED",
      table_name: "fee_structures",
      record_id: id,
      old_data: existing,
      new_data: updateData,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[fees PATCH] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Fee structure ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Check if there are payments linked to this structure
    const { data: payments } = await admin
      .from("fee_payments")
      .select("id")
      .eq("fee_structure_id", id)
      .limit(1);

    if (payments && payments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete fee structure with recorded payments." },
        { status: 400 }
      );
    }

    const { error } = await admin.from("fee_structures").delete().eq("id", id);

    if (error) {
      console.error("[fees DELETE] Delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete fee structure" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "FEE_STRUCTURE_DELETED",
      table_name: "fee_structures",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[fees DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
