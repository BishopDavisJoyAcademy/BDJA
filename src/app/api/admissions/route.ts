import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { z } from "zod";
import type { Database } from "@/types/database";

type Json = Database["public"]["Tables"]["admissions"]["Row"]["documents"];
type AdmissionInsert = Database["public"]["Tables"]["admissions"]["Insert"];

export const dynamic = "force-dynamic";

const admissionInsertSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  grade_applied: z.string().min(1, "Grade applied is required"),
  campus_id: z.string().uuid("Valid campus ID is required"),
  parent_name: z.string().nullable().optional(),
  parent_email: z.string().email().nullable().optional(),
  parent_phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["pending", "approved", "rejected", "enrolled"]).optional().default("pending"),
  admission_number: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
});

const admissionUpdateSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "enrolled"]).optional(),
  notes: z.string().nullable().optional(),
  reviewed_by: z.string().uuid().nullable().optional(),
});

function isJson(val: unknown): val is Json {
  if (val === null || typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return true;
  }
  if (Array.isArray(val)) {
    return val.every(isJson);
  }
  if (typeof val === "object" && val !== null) {
    return Object.values(val).every((v) => v === undefined || isJson(v));
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = admin.from("admissions").select("*");
    if (status) query = query.eq("status", status);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("[admissions GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch admissions" }, { status: 500 });
    }
    return NextResponse.json({ admissions: data || [] });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[admissions GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "admissions.manage");

    const admin = getSupabaseAdmin();
    const rawBody = await req.json();

    // Normalize legacy frontend field names to database schema
    const normalizedBody: Record<string, unknown> = { ...rawBody };
    if (rawBody.student_name && typeof rawBody.student_name === "string") {
      const parts = rawBody.student_name.trim().split(/\s+/);
      normalizedBody.first_name = parts[0] || "";
      normalizedBody.last_name = parts.slice(1).join(" ") || "";
      delete normalizedBody.student_name;
    }
    if (rawBody.grade_level !== undefined) {
      normalizedBody.grade_applied = rawBody.grade_level;
      delete normalizedBody.grade_level;
    }
    if (rawBody.email !== undefined) {
      normalizedBody.parent_email = rawBody.email;
      delete normalizedBody.email;
    }
    if (rawBody.phone !== undefined) {
      normalizedBody.parent_phone = rawBody.phone;
      delete normalizedBody.phone;
    }
    if (rawBody.submitted_at !== undefined) {
      delete normalizedBody.submitted_at;
    }

    const parseResult = admissionInsertSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const insertData = parseResult.data;
    const payload: AdmissionInsert = { ...insertData };

    // Handle documents separately with type-safe validation
    if (rawBody.documents !== undefined && isJson(rawBody.documents)) {
      payload.documents = rawBody.documents;
    }

    const { data, error } = await admin
      .from("admissions")
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[admissions POST] Supabase error:", error);
      return NextResponse.json({ error: "Failed to create admission" }, { status: 500 });
    }
    return NextResponse.json({ success: true, admission: data });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[admissions POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "admissions.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Admission ID is required" }, { status: 400 });
    }

    const rawBody = await req.json();
    const parseResult = admissionUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...parseResult.data };
    if (updateData.status && !updateData.reviewed_by) {
      updateData.reviewed_by = session.userId;
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("admissions")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[admissions PUT] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update admission" }, { status: 500 });
    }
    return NextResponse.json({ success: true, admission: data });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[admissions PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "admissions.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Admission ID is required" }, { status: 400 });
    }

    const { error } = await admin.from("admissions").delete().eq("id", id);
    if (error) {
      console.error("[admissions DELETE] Supabase error:", error);
      return NextResponse.json({ error: "Failed to delete admission" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[admissions DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
