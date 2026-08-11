import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { z } from "zod";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

const feePaymentInsertSchema = z.object({
  student_id: z.string().uuid("Valid student ID is required"),
  fee_structure_id: z.string().uuid("Valid fee structure ID is required"),
  amount: z.number().positive("Amount must be positive"),
  payment_method: z.enum(["cash", "bank_transfer", "mpesa", "cheque", "card", "other"]),
  notes: z.string().nullable().optional(),
  status: z.enum(["pending", "verified", "rejected", "refunded"]).optional().default("pending"),
  receipt_number: z.string().nullable().optional(),
  receipt_url: z.string().url().nullable().optional(),
  transaction_ref: z.string().nullable().optional(),
});

const feePaymentUpdateSchema = z.object({
  status: z.enum(["pending", "verified", "rejected", "refunded"]).optional(),
  notes: z.string().nullable().optional(),
  receipt_number: z.string().nullable().optional(),
  receipt_url: z.string().url().nullable().optional(),
  transaction_ref: z.string().nullable().optional(),
  verified_by: z.string().uuid().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student_id");
    const status = searchParams.get("status");

    let query = admin
      .from("fee_payments")
      .select("*, profiles:student_id(full_name, id), fee_structures:fee_structure_id(grade_level, term, academic_year)");

    if (studentId) query = query.eq("student_id", studentId);
    if (status) query = query.eq("status", status);

    if (session.userCategory === "student") {
      query = query.eq("student_id", session.userId);
    } else if (session.userCategory === "parent") {
      const { data: children } = await admin
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", session.userId);
      const childIds = (children || []).map((c) => c.student_id);
      if (childIds.length > 0) query = query.in("student_id", childIds);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("[fees GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch fees" }, { status: 500 });
    }
    return NextResponse.json({ fees: data || [] });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[fees GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "fees.manage");

    const admin = getSupabaseAdmin();
    const rawBody = await req.json();

    // Normalize legacy frontend field names
    const normalizedBody: Record<string, unknown> = { ...rawBody };
    if (rawBody.paid_at !== undefined) {
      delete normalizedBody.paid_at;
    }
    if (rawBody.balance !== undefined) {
      delete normalizedBody.balance;
    }
    if (rawBody.term !== undefined) {
      delete normalizedBody.term;
    }
    if (rawBody.academic_year !== undefined) {
      delete normalizedBody.academic_year;
    }

    const parseResult = feePaymentInsertSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("fee_payments")
      .insert(parseResult.data)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[fees POST] Supabase error:", error);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
    return NextResponse.json({ success: true, fee: data });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[fees POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "fees.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Fee payment ID is required" }, { status: 400 });
    }

    const rawBody = await req.json();
    const parseResult = feePaymentUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validated = parseResult.data;
    const updateData: Database["public"]["Tables"]["fee_payments"]["Update"] = { ...validated };
    if (validated.status === "verified" && !validated.verified_by) {
      updateData.verified_by = session.userId;
      updateData.verified_at = new Date().toISOString();
    }

    const { data, error } = await admin
      .from("fee_payments")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[fees PUT] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update fee payment" }, { status: 500 });
    }
    return NextResponse.json({ success: true, fee: data });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[fees PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "fees.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Fee payment ID is required" }, { status: 400 });
    }

    const { error } = await admin.from("fee_payments").delete().eq("id", id);
    if (error) {
      console.error("[fees DELETE] Supabase error:", error);
      return NextResponse.json({ error: "Failed to delete fee payment" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[fees DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
