import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";
import { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const VALID_TABLES = [
  "profiles", "students", "staff", "classes", "subjects", "campuses",
  "fee_structures", "fee_payments", "announcements", "calendar_events",
  "attendance", "assessments", "admissions", "library_resources",
] as const;

type ValidTable = typeof VALID_TABLES[number];

const VALID_FORMATS = ["csv", "json"] as const;
type ValidFormat = typeof VALID_FORMATS[number];

function isValidTable(name: string): name is ValidTable {
  return VALID_TABLES.includes(name as ValidTable);
}

function isValidFormat(fmt: string): fmt is ValidFormat {
  return VALID_FORMATS.includes(fmt as ValidFormat);
}

interface DataExport {
  id: string;
  name: string;
  export_type: string;
  table_name: string | null;
  filters: Json | null;
  file_url: string | null;
  file_size: number | null;
  status: string;
  error_message: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const exportId = searchParams.get("export_id");

    if (type === "tables") {
      return NextResponse.json({ tables: VALID_TABLES });
    }

    if (type === "exports") {
      const { data: exports, error } = await admin
        .from("data_exports")
        .select("*")
        .eq("created_by", session.userId)
        .in("export_type", ["csv", "json"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[backup GET] Exports error:", error.message);
        return NextResponse.json({ error: "Failed to fetch exports" }, { status: 500 });
      }
      return NextResponse.json({ exports: exports || [] });
    }

    if (exportId) {
      const { data: exportRecord, error } = await admin
        .from("data_exports")
        .select("*")
        .eq("id", exportId)
        .eq("created_by", session.userId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: "Failed to fetch export" }, { status: 500 });
      }
      if (!exportRecord) {
        return NextResponse.json({ error: "Export not found" }, { status: 404 });
      }

      return NextResponse.json({ export: exportRecord });
    }

    return NextResponse.json({ error: "Specify type or export_id" }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[backup GET] Unhandled error:", error);
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
    const action = body.action || "export";

    if (action === "export") {
      return handleExport(body, session, req);
    }
    if (action === "preview") {
      return handlePreview(body, session);
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
    console.error("[backup POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleExport(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const tableName = String(body.table_name || "").trim();
  const format = String(body.format || "json").trim();

  if (!isValidTable(tableName)) {
    throw new ValidationError(`Invalid table name. Must be one of: ${VALID_TABLES.join(", ")}`);
  }
  if (!isValidFormat(format)) {
    throw new ValidationError(`Invalid format. Must be one of: ${VALID_FORMATS.join(", ")}`);
  }

  const filters = body.filters as Record<string, unknown> | null;
  const exportName = String(body.name || "").trim() || `${tableName}_backup_${new Date().toISOString().split("T")[0]}_${Date.now()}.${format}`;

  const admin = getSupabaseAdmin();

  const { data: exportRecord, error: exportError } = await admin.from("data_exports").insert({
    name: exportName,
    export_type: format,
    table_name: tableName,
    filters: filters as Json,
    status: "pending",
    created_by: session.userId,
  }).select().single();

  if (exportError) {
    console.error("[backup POST] Export create error:", exportError.message);
    return NextResponse.json({ error: "Failed to create export" }, { status: 500 });
  }

  // Process export asynchronously
  processBackupExport(exportRecord.id, tableName, format, filters, admin).catch((err) => {
    console.error("[backup POST] Export processing error:", err);
  });

  await logAudit({
    user_id: session.userId,
    action: "BACKUP_EXPORT_CREATED",
    table_name: "data_exports",
    record_id: exportRecord.id,
    new_data: { table_name: tableName, format },
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, export: exportRecord });
}

async function processBackupExport(
  exportId: string,
  tableName: ValidTable,
  format: ValidFormat,
  filters: Record<string, unknown> | null,
  admin: ReturnType<typeof getSupabaseAdmin>
) {
  try {
    await admin.from("data_exports").update({ status: "running" }).eq("id", exportId);

    // Fetch data using type-safe table queries
    const rawData = await fetchTableData(admin, tableName, filters);

    let fileContent: string;
    let contentType: string;

    if (format === "json") {
      fileContent = JSON.stringify(rawData, null, 2);
      contentType = "application/json";
    } else {
      fileContent = arrayToCsv(rawData);
      contentType = "text/csv";
    }

    const blob = new Blob([fileContent], { type: contentType });
    const fileSize = blob.size;
    const fileUrl = `data:${contentType};base64,${Buffer.from(fileContent).toString("base64")}`;

    await admin.from("data_exports").update({
      status: "completed",
      file_url: fileUrl,
      file_size: fileSize,
      completed_at: new Date().toISOString(),
    }).eq("id", exportId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Export failed";
    await admin.from("data_exports").update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    }).eq("id", exportId);
  }
}

async function fetchTableData(
  admin: ReturnType<typeof getSupabaseAdmin>,
  tableName: ValidTable,
  filters: Record<string, unknown> | null
): Promise<Record<string, unknown>[]> {
  // Type-safe table queries — each table handled explicitly
  switch (tableName) {
    case "profiles": {
      let q = admin.from("profiles").select("*");
      if (filters?.campus_id) q = q.eq("campus_id", String(filters.campus_id));
      if (filters?.status) q = q.eq("is_active", String(filters.status) === "active");
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "students": {
      let q = admin.from("students").select("*");
      if (filters?.campus_id) q = q.eq("campus_id", String(filters.campus_id));
      if (filters?.grade_level) q = q.eq("grade_level", String(filters.grade_level));
      if (filters?.status) q = q.eq("status", String(filters.status));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "staff": {
      let q = admin.from("staff").select("*");
      if (filters?.status) q = q.eq("status", String(filters.status));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "classes": {
      let q = admin.from("classes").select("*");
      if (filters?.campus_id) q = q.eq("campus_id", String(filters.campus_id));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "subjects": {
      let q = admin.from("subjects").select("*");
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "campuses": {
      const { data, error } = await admin.from("campuses").select("*");
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "fee_structures": {
      let q = admin.from("fee_structures").select("*");
      if (filters?.campus_id) q = q.eq("campus_id", String(filters.campus_id));
      if (filters?.grade_level) q = q.eq("grade_level", String(filters.grade_level));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "fee_payments": {
      let q = admin.from("fee_payments").select("*");
      if (filters?.date_from) q = q.gte("created_at", String(filters.date_from));
      if (filters?.date_to) q = q.lte("created_at", String(filters.date_to));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "announcements": {
      let q = admin.from("announcements").select("*");
      if (filters?.date_from) q = q.gte("created_at", String(filters.date_from));
      if (filters?.date_to) q = q.lte("created_at", String(filters.date_to));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "calendar_events": {
      let q = admin.from("calendar_events").select("*");
      if (filters?.date_from) q = q.gte("start_date", String(filters.date_from));
      if (filters?.date_to) q = q.lte("end_date", String(filters.date_to));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "attendance": {
      let q = admin.from("attendance").select("*");
      if (filters?.date_from) q = q.gte("date", String(filters.date_from));
      if (filters?.date_to) q = q.lte("date", String(filters.date_to));
      if (filters?.status) q = q.eq("status", String(filters.status));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "assessments": {
      let q = admin.from("assessments").select("*");
      if (filters?.date_from) q = q.gte("created_at", String(filters.date_from));
      if (filters?.date_to) q = q.lte("created_at", String(filters.date_to));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "admissions": {
      let q = admin.from("admissions").select("*");
      if (filters?.campus_id) q = q.eq("campus_id", String(filters.campus_id));
      if (filters?.status) q = q.eq("status", String(filters.status));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    case "library_resources": {
      let q = admin.from("library_resources").select("*");
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    }
    default:
      return [];
  }
}

async function handlePreview(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>
) {
  const tableName = String(body.table_name || "").trim();

  if (!isValidTable(tableName)) {
    throw new ValidationError(`Invalid table name: ${tableName}`);
  }

  const filters = body.filters as Record<string, unknown> | null;
  const admin = getSupabaseAdmin();

  const rawData = await fetchTableData(admin, tableName, filters);
  const previewData = rawData.slice(0, 10);

  return NextResponse.json({
    success: true,
    table: tableName,
    preview: previewData,
    total_count: rawData.length,
    columns: previewData.length > 0 ? Object.keys(previewData[0]) : [],
  });
}

function arrayToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const exportId = searchParams.get("export_id");

    if (!exportId) return NextResponse.json({ error: "Export ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { error } = await admin
      .from("data_exports")
      .delete()
      .eq("id", exportId)
      .eq("created_by", session.userId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete export" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "BACKUP_EXPORT_DELETED",
      table_name: "data_exports",
      record_id: exportId,
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
    console.error("[backup DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
