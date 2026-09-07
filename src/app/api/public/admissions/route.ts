import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const admissionSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  grade_applied: z.string().min(1, "Grade applied is required"),
  campus_id: z.string().uuid("Valid campus is required"),
  previous_school: z.string().nullable().optional(),
  previous_grade: z.string().nullable().optional(),
  home_address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  county: z.string().nullable().optional(),
  country: z.string().nullable().optional().default("Kenya"),
  nationality: z.string().nullable().optional().default("Kenyan"),
  religion: z.string().nullable().optional(),
  birth_certificate_no: z.string().nullable().optional(),
  passport_no: z.string().nullable().optional(),
  sibling_names: z.string().nullable().optional(),
  medical_conditions: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  special_needs: z.string().nullable().optional(),
  parent_name: z.string().min(1, "Parent/guardian name is required"),
  parent_email: z.string().email().nullable().optional(),
  parent_phone: z.string().min(1, "Parent phone is required"),
  parent_occupation: z.string().nullable().optional(),
  parent_address: z.string().nullable().optional(),
  parent_id_number: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  emergency_contact_relationship: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  custom_fields: z.record(z.unknown()).nullable().optional().default({}),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // Convert empty strings to null/undefined for optional fields
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawBody)) {
      body[key] = value === "" ? null : value;
    }

    const parseResult = admissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const admin = getSupabaseAdmin();

    // Verify campus exists
    const { data: campus } = await admin
      .from("campuses")
      .select("id, name")
      .eq("id", data.campus_id)
      .maybeSingle();

    if (!campus) {
      return NextResponse.json({ error: "Selected campus does not exist" }, { status: 400 });
    }

    const { data: inserted, error } = await admin
      .from("admissions")
      .insert({
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        grade_applied: data.grade_applied,
        campus_id: data.campus_id,
        previous_school: data.previous_school,
        previous_grade: data.previous_grade,
        home_address: data.home_address,
        city: data.city,
        county: data.county,
        country: data.country,
        nationality: data.nationality,
        religion: data.religion,
        birth_certificate_no: data.birth_certificate_no,
        passport_no: data.passport_no,
        sibling_names: data.sibling_names,
        medical_conditions: data.medical_conditions,
        allergies: data.allergies,
        special_needs: data.special_needs,
        parent_name: data.parent_name,
        parent_email: data.parent_email,
        parent_phone: data.parent_phone,
        parent_occupation: data.parent_occupation,
        parent_address: data.parent_address,
        parent_id_number: data.parent_id_number,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_relationship: data.emergency_contact_relationship,
        notes: data.notes,
        custom_fields: data.custom_fields as unknown as import("@/types/database").Json,
        status: "pending",
        admission_date: new Date().toISOString().split("T")[0],
      })
      .select()
      .maybeSingle();

    if (error) {
      // error logged above
      return NextResponse.json({ error: "Failed to submit application. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      admission: inserted,
      message: "Your application has been received and will be reviewed.",
    });
  } catch (err: unknown) {
    // exception handled
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await admin
        .from("admissions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      return NextResponse.json({ admission: data });
    }

    // Public GET only returns count for transparency
    const { count, error } = await admin
      .from("admissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) {
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    return NextResponse.json({ pendingCount: count || 0 });
  } catch (err: unknown) {
    // exception handled
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
