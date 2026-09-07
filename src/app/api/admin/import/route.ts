"use server";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";
import { Json } from "@/types/database";

export const dynamic = "force-dynamic";

interface CsvImportBatch {
  id: string;
  import_type: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  status: string;
  error_summary: Json | null;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

interface CsvImportRow {
  id: string;
  batch_id: string;
  row_number: number;
  raw_data: Json;
  status: string;
  validation_errors: Json | null;
  imported_record_id: string | null;
  created_at: string | null;
}

const VALID_IMPORT_TYPES = ["students", "staff", "parents"];

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batch_id");
    const type = searchParams.get("type");

    if (type === "batches") {
      const { data: batches, error } = await admin
        .from("csv_import_batches")
        .select("*")
        .eq("created_by", session.userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[import GET] Batches error:", error.message);
        return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
      }
      return NextResponse.json({ batches: batches || [] });
    }

    if (batchId) {
      const { data: batch, error: batchError } = await admin
        .from("csv_import_batches")
        .select("*")
        .eq("id", batchId)
        .maybeSingle();

      if (batchError) {
        return NextResponse.json({ error: "Failed to fetch batch" }, { status: 500 });
      }
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }

      const { data: rows, error: rowsError } = await admin
        .from("csv_import_rows")
        .select("*")
        .eq("batch_id", batchId)
        .order("row_number", { ascending: true });

      if (rowsError) {
        return NextResponse.json({ error: "Failed to fetch rows" }, { status: 500 });
      }

      return NextResponse.json({ batch, rows: rows || [] });
    }

    return NextResponse.json({ error: "Specify batch_id or type=batches" }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[import GET] Unhandled error:", error);
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
    const action = body.action || "validate";

    if (action === "validate") {
      return handleValidate(body, session, req);
    }
    if (action === "import") {
      return handleImport(body, session, req);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
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
    console.error("[import POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleValidate(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const importType = String(body.import_type || "").trim();
  const rows = body.rows as Array<Record<string, unknown>>;
  const mapping = body.mapping as Record<string, string> | null;

  if (!VALID_IMPORT_TYPES.includes(importType)) {
    throw new ValidationError(`Invalid import type. Must be one of: ${VALID_IMPORT_TYPES.join(", ")}`);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError("Rows array is required");
  }

  const validatedRows: Array<{
    row_number: number;
    raw_data: Record<string, unknown>;
    status: string;
    validation_errors: string[];
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    const mappedRow = mapping ? applyMapping(row, mapping) : row;

    if (importType === "students") {
      if (!mappedRow.first_name) errors.push("First name is required");
      if (!mappedRow.last_name) errors.push("Last name is required");
      if (!mappedRow.grade_level) errors.push("Grade level is required");
      if (mappedRow.parent_email && !isValidEmail(String(mappedRow.parent_email))) {
        errors.push("Invalid parent email format");
      }
      if (mappedRow.date_of_birth && !isValidDate(String(mappedRow.date_of_birth))) {
        errors.push("Invalid date of birth format (expected YYYY-MM-DD)");
      }
    } else if (importType === "staff") {
      if (!mappedRow.full_name) errors.push("Full name is required");
      if (!mappedRow.email) errors.push("Email is required");
      if (mappedRow.email && !isValidEmail(String(mappedRow.email))) {
        errors.push("Invalid email format");
      }
      if (!mappedRow.department) errors.push("Department is required");
    } else if (importType === "parents") {
      if (!mappedRow.full_name) errors.push("Full name is required");
      if (!mappedRow.email) errors.push("Email is required");
      if (mappedRow.email && !isValidEmail(String(mappedRow.email))) {
        errors.push("Invalid email format");
      }
      if (!mappedRow.phone) errors.push("Phone is required");
    }

    validatedRows.push({
      row_number: i + 1,
      raw_data: mappedRow,
      status: errors.length === 0 ? "valid" : "invalid",
      validation_errors: errors,
    });
  }

  const validCount = validatedRows.filter((r) => r.status === "valid").length;
  const invalidCount = validatedRows.filter((r) => r.status === "invalid").length;

  await logAudit({
    user_id: session.userId,
    action: "CSV_VALIDATED",
    table_name: "csv_import_batches",
    new_data: { import_type: importType, total: rows.length, valid: validCount, invalid: invalidCount },
    ip_address: getClientIP(req),
  });

  return NextResponse.json({
    success: true,
    total: rows.length,
    valid: validCount,
    invalid: invalidCount,
    rows: validatedRows,
  });
}

async function handleImport(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const importType = String(body.import_type || "").trim();
  const fileName = String(body.file_name || "").trim();
  const rows = body.rows as Array<{
    row_number: number;
    raw_data: Record<string, unknown>;
    status: string;
    validation_errors: string[];
  }>;

  if (!VALID_IMPORT_TYPES.includes(importType)) {
    throw new ValidationError(`Invalid import type: ${importType}`);
  }
  if (!fileName) throw new ValidationError("File name is required");
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError("Rows array is required");
  }

  const validRows = rows.filter((r) => r.status === "valid");

  const { data: batch, error: batchError } = await admin.from("csv_import_batches").insert({
    import_type: importType,
    file_name: fileName,
    total_rows: rows.length,
    processed_rows: 0,
    success_count: 0,
    error_count: 0,
    status: "importing",
    created_by: session.userId,
    started_at: new Date().toISOString(),
  }).select().single();

  if (batchError) {
    console.error("[import POST] Batch create error:", batchError.message);
    return NextResponse.json({ error: "Failed to create import batch" }, { status: 500 });
  }

  // Insert all rows
  const rowInserts = rows.map((r) => ({
    batch_id: batch.id,
    row_number: r.row_number,
    raw_data: r.raw_data as Json,
    status: r.status,
    validation_errors: r.validation_errors.length > 0 ? (r.validation_errors as unknown as Json) : null,
  }));

  const { error: rowsError } = await admin.from("csv_import_rows").insert(rowInserts);
  if (rowsError) {
    console.error("[import POST] Rows insert error:", rowsError.message);
  }

  // Process valid rows
  let successCount = 0;
  let errorCount = 0;
  const errorSummary: Array<{ row: number; error: string }> = [];

  for (const row of validRows) {
    try {
      const record = await insertRecord(admin, importType, row.raw_data, session.userId);
      if (record) {
        successCount++;
        await admin
          .from("csv_import_rows")
          .update({ status: "imported", imported_record_id: record.id })
          .eq("batch_id", batch.id)
          .eq("row_number", row.row_number);
      }
    } catch (err: unknown) {
      errorCount++;
      const msg = err instanceof Error ? err.message : "Import failed";
      errorSummary.push({ row: row.row_number, error: msg });
      await admin
        .from("csv_import_rows")
        .update({ status: "failed", validation_errors: [msg] as unknown as Json })
        .eq("batch_id", batch.id)
        .eq("row_number", row.row_number);
    }
  }

  const finalStatus = errorCount === 0 && successCount === validRows.length ? "completed" : "completed";

  await admin.from("csv_import_batches").update({
    status: finalStatus,
    processed_rows: validRows.length,
    success_count: successCount,
    error_count: errorCount,
    error_summary: errorSummary.length > 0 ? (errorSummary as unknown as Json) : null,
    completed_at: new Date().toISOString(),
  }).eq("id", batch.id);

  await logAudit({
    user_id: session.userId,
    action: "CSV_IMPORTED",
    table_name: "csv_import_batches",
    record_id: batch.id,
    new_data: { import_type: importType, total: rows.length, success: successCount, error: errorCount },
    ip_address: getClientIP(req),
  });

  return NextResponse.json({
    success: true,
    batch_id: batch.id,
    total: rows.length,
    imported: successCount,
    failed: errorCount,
    error_summary: errorSummary.length > 0 ? errorSummary : undefined,
  });
}

async function insertRecord(
  admin: ReturnType<typeof getSupabaseAdmin>,
  importType: string,
  data: Record<string, unknown>,
  createdBy: string
): Promise<{ id: string } | null> {
  if (importType === "students") {
    const { data: profile, error: profileError } = await admin.from("profiles").insert({
      email: data.email ? String(data.email) : `${Date.now()}@placeholder.bdja`,
      full_name: `${String(data.first_name || "").trim()} ${String(data.last_name || "").trim()}`.trim(),
      role: "student",
      user_category: "student",
      campus_id: data.campus_id ? String(data.campus_id) : null,
      is_active: true,
      password_changed: false,
      onboarding_completed: false,
      created_by: createdBy,
    }).select("id").single();

    if (profileError || !profile) throw new Error(profileError?.message || "Failed to create profile");

    const { error: studentError } = await admin.from("students").insert({
      student_id: profile.id,
      parent_id: data.parent_id ? String(data.parent_id) : createdBy,
      relationship: data.relationship ? String(data.relationship) : "guardian",
      is_primary: data.is_primary === true,
    });

    if (studentError) throw new Error(studentError.message);

    // Create admission record for tracking
    await admin.from("admissions").insert({
      first_name: String(data.first_name || "").trim(),
      last_name: String(data.last_name || "").trim(),
      grade_applied: String(data.grade_level || "").trim(),
      campus_id: data.campus_id ? String(data.campus_id) : createdBy,
      parent_name: data.parent_name ? String(data.parent_name) : null,
      parent_email: data.parent_email ? String(data.parent_email) : null,
      parent_phone: data.parent_phone ? String(data.parent_phone) : null,
      date_of_birth: data.date_of_birth ? String(data.date_of_birth) : null,
      gender: data.gender ? String(data.gender) : null,
      status: "approved",
      reviewed_by: createdBy,
    });

    return profile;
  }

  if (importType === "staff") {
    const { data: profile, error: profileError } = await admin.from("profiles").insert({
      email: String(data.email || "").trim(),
      full_name: String(data.full_name || "").trim(),
      role: "staff",
      user_category: "staff",
      phone: data.phone ? String(data.phone) : null,
      campus_id: data.campus_id ? String(data.campus_id) : null,
      is_active: true,
      password_changed: false,
      onboarding_completed: false,
      created_by: createdBy,
    }).select("id").single();

    if (profileError || !profile) throw new Error(profileError?.message || "Failed to create profile");

    const { error: staffError } = await admin.from("staff").insert({
      id: profile.id,
      employee_id: data.employee_id ? String(data.employee_id) : null,
      department: String(data.department || "").trim(),
      designation: data.designation ? String(data.designation) : null,
      status: data.status ? String(data.status) : "active",
      join_date: data.join_date ? String(data.join_date) : null,
    });

    if (staffError) throw new Error(staffError.message);
    return profile;
  }

  if (importType === "parents") {
    const { data: profile, error: profileError } = await admin.from("profiles").insert({
      email: String(data.email || "").trim(),
      full_name: String(data.full_name || "").trim(),
      role: "parent",
      user_category: "parent",
      phone: data.phone ? String(data.phone) : null,
      campus_id: data.campus_id ? String(data.campus_id) : null,
      is_active: true,
      password_changed: false,
      onboarding_completed: false,
      created_by: createdBy,
    }).select("id").single();

    if (profileError || !profile) throw new Error(profileError?.message || "Failed to create profile");
    return profile;
  }

  return null;
}

function applyMapping(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [csvCol, dbField] of Object.entries(mapping)) {
    if (row[csvCol] !== undefined) {
      result[dbField] = row[csvCol];
    }
  }
  return result;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(date: string): boolean {
  const d = new Date(date);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batch_id");

    if (!batchId) return NextResponse.json({ error: "Batch ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { error } = await admin.from("csv_import_batches").delete().eq("id", batchId).eq("created_by", session.userId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete batch" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "CSV_BATCH_DELETED",
      table_name: "csv_import_batches",
      record_id: batchId,
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
    console.error("[import DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
