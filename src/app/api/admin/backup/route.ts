"use server";

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
  "attendance", "grades", "admissions", "library_resources",
];

const VALID_FORMATS = ["csv", "json"];

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
  const admin = getSupabaseAdmin();

  const tableName = String(body.table_name || "").trim();
  const format = String(body.format || "json").trim();
  const filters = body.filters as Record<string, unknown> | null;

  if (!VALID_TABLES.includes(tableName)) {
    throw new ValidationError(`Invalid table name. Must be one of: ${VALID_TABLES.join(", ")}`);
  }
  if (!VALID_FORMATS.includes(format)) {
    throw new ValidationError(`Invalid format. Must be one of: ${VALID_FORMATS.join(", ")}`);
  }

  const exportName = `${tableName}_backup_${new Date().toISOString().split("T")[0]}_${Date.now()}.${format}`;

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
  tableName: string,
  format: string,
  filters: Record<string, unknown> | null,
  admin: ReturnType<typeof getSupabaseAdmin>
) {
  try {
    await admin.from("data_exports").update({ status: "running" }).eq("id", exportId);

    let query = admin.from(tableName).select("*");

    if (filters && typeof filters === "object") {
      if (filters.campus_id) query = query.eq("campus_id", String(filters.campus_id));
      if (filters.date_from) query = query.gte("created_at", String(filters.date_from));
      if (filters.date_to) query = query.lte("created_at", String(filters.date_to));
      if (filters.status) query = query.eq("status", String(filters.status));
    }

    const { data, error } = await query;

    if (error) throw error;

    let fileContent: string;
    let contentType: string;

    if (format === "json") {
      fileContent = JSON.stringify(data || [], null, 2);
      contentType = "application/json";
    } else {
      fileContent = arrayToCsv(data || []);
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

async function handlePreview(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>
) {
  const admin = getSupabaseAdmin();

  const tableName = String(body.table_name || "").trim();
  const filters = body.filters as Record<string, unknown> | null;

  if (!VALID_TABLES.includes(tableName)) {
    throw new ValidationError(`Invalid table name: ${tableName}`);
  }

  let query = admin.from(tableName).select("*").limit(10);

  if (filters && typeof filters === "object") {
    if (filters.campus_id) query = query.eq("campus_id", String(filters.campus_id));
    if (filters.date_from) query = query.gte("created_at", String(filters.date_from));
    if (filters.date_to) query = query.lte("created_at", String(filters.date_to));
  }

  const { data, error, count } = await admin
    .from(tableName)
    .select("*", { count: "exact" })
    .limit(10);

  if (error) {
    console.error("[backup POST] Preview error:", error.message);
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    table: tableName,
    preview: data || [],
    total_count: count || 0,
    columns: data && data.length > 0 ? Object.keys(data[0]) : [],
  });
}

function arrayToCsv(data: Array<Record<string, unknown>>): string {
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
