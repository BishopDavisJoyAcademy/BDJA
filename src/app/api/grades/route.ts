import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assessmentInsertSchema = z.object({
  student_id: z.string().uuid("Valid student ID is required"),
  subject_id: z.string().uuid("Valid subject ID is required"),
  class_id: z.string().uuid("Valid class ID is required"),
  term: z.string().min(1, "Term is required"),
  academic_year: z.string().min(1, "Academic year is required"),
  score: z.number().min(0).nullable().optional(),
  max_score: z.number().positive().nullable().optional(),
  performance_level: z.enum(["exceeding", "meeting", "approaching", "below"]),
  strand: z.string().min(1, "Strand is required"),
  sub_strand: z.string().min(1, "Sub-strand is required"),
  specific_learning_outcome: z.string().nullable().optional(),
  change_reason: z.string().nullable().optional(),
});

const assessmentUpdateSchema = z.object({
  score: z.number().min(0).nullable().optional(),
  max_score: z.number().positive().nullable().optional(),
  performance_level: z.enum(["exceeding", "meeting", "approaching", "below"]).optional(),
  strand: z.string().optional(),
  sub_strand: z.string().optional(),
  specific_learning_outcome: z.string().nullable().optional(),
  change_reason: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student_id");
    const term = searchParams.get("term");
    const year = searchParams.get("year");
    const classId = searchParams.get("class_id");
    const subjectId = searchParams.get("subject_id");

    let query = admin
      .from("assessments")
      .select("*, profiles:student_id(full_name, id), subjects:subject_id(name, code), classes:class_id(name, grade_level)");

    if (studentId) query = query.eq("student_id", studentId);
    if (term) query = query.eq("term", term);
    if (year) query = query.eq("academic_year", year);
    if (classId) query = query.eq("class_id", classId);
    if (subjectId) query = query.eq("subject_id", subjectId);

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
      console.error("[grades GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
    }
    return NextResponse.json({ grades: data || [] });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[grades GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "grades.manage");

    const admin = getSupabaseAdmin();
    const rawBody = await req.json();

    const parseResult = assessmentInsertSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const insertData = {
      ...parseResult.data,
      assessed_by: session.userId,
    };

    const { data, error } = await admin
      .from("assessments")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[grades POST] Supabase error:", error);
      return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
    }
    return NextResponse.json({ success: true, grade: data });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[grades POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "grades.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Grade ID is required" }, { status: 400 });
    }

    const rawBody = await req.json();
    const parseResult = assessmentUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData = {
      ...parseResult.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("assessments")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[grades PUT] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
    }
    return NextResponse.json({ success: true, grade: data });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[grades PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "grades.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Grade ID is required" }, { status: 400 });
    }

    const { error } = await admin.from("assessments").delete().eq("id", id);
    if (error) {
      console.error("[grades DELETE] Supabase error:", error);
      return NextResponse.json({ error: "Failed to delete grade" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[grades DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
