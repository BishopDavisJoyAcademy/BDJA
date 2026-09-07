"use server";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";
import { Json } from "@/types/database";

export const dynamic = "force-dynamic";

interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  config: Json;
  created_by: string;
  is_shared: boolean | null;
  created_at: string | null;
  updated_at: string | null;
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

const VALID_REPORT_TYPES = ["students", "staff", "parents", "attendance", "grades", "fees", "classes", "custom"];
const VALID_EXPORT_TYPES = ["csv", "json", "pdf", "excel"];

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const templateId = searchParams.get("template_id");
    const exportId = searchParams.get("export_id");

    if (type === "templates") {
      const { data: templates, error } = await admin
        .from("report_templates")
        .select("*")
        .or(`created_by.eq.${session.userId},is_shared.eq.true`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[reports GET] Templates error:", error.message);
        return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
      }
      return NextResponse.json({ templates: templates || [] });
    }

    if (type === "exports") {
      const { data: exports, error } = await admin
        .from("data_exports")
        .select("*")
        .eq("created_by", session.userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[reports GET] Exports error:", error.message);
        return NextResponse.json({ error: "Failed to fetch exports" }, { status: 500 });
      }
      return NextResponse.json({ exports: exports || [] });
    }

    if (templateId) {
      const { data: template, error } = await admin
        .from("report_templates")
        .select("*")
        .eq("id", templateId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
      }
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json({ template });
    }

    if (exportId) {
      const { data: exportRecord, error } = await admin
        .from("data_exports")
        .select("*")
        .eq("id", exportId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: "Failed to fetch export" }, { status: 500 });
      }
      if (!exportRecord) {
        return NextResponse.json({ error: "Export not found" }, { status: 404 });
      }
      return NextResponse.json({ export: exportRecord });
    }

    return NextResponse.json({ error: "Specify type, template_id, or export_id" }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[reports GET] Unhandled error:", error);
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
    const action = body.action || "create_template";

    if (action === "create_template") {
      return handleCreateTemplate(body, session, req);
    }
    if (action === "generate_export") {
      return handleGenerateExport(body, session, req);
    }
    if (action === "run_report") {
      return handleRunReport(body, session, req);
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
    console.error("[reports POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleCreateTemplate(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const name = String(body.name || "").trim();
  const description = body.description ? String(body.description).trim() : null;
  const reportType = String(body.report_type || "").trim();
  const config = body.config as Json;
  const isShared = body.is_shared === true;

  if (!name) throw new ValidationError("Template name is required");
  if (!VALID_REPORT_TYPES.includes(reportType)) {
    throw new ValidationError(`Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(", ")}`);
  }
  if (!config || typeof config !== "object") {
    throw new ValidationError("Config is required and must be an object");
  }

  const { data, error } = await admin.from("report_templates").insert({
    name,
    description,
    report_type: reportType,
    config,
    created_by: session.userId,
    is_shared: isShared,
  }).select().single();

  if (error) {
    console.error("[reports POST] Create template error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create template" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "REPORT_TEMPLATE_CREATED",
    table_name: "report_templates",
    record_id: data.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, template: data });
}

async function handleGenerateExport(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const name = String(body.name || "").trim();
  const exportType = String(body.export_type || "").trim();
  const tableName = body.table_name ? String(body.table_name).trim() : null;
  const filters = body.filters as Json | null;

  if (!name) throw new ValidationError("Export name is required");
  if (!VALID_EXPORT_TYPES.includes(exportType)) {
    throw new ValidationError(`Invalid export type. Must be one of: ${VALID_EXPORT_TYPES.join(", ")}`);
  }

  const { data: exportRecord, error } = await admin.from("data_exports").insert({
    name,
    export_type: exportType,
    table_name: tableName,
    filters,
    status: "pending",
    created_by: session.userId,
  }).select().single();

  if (error) {
    console.error("[reports POST] Create export error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create export" }, { status: 500 });
  }

  // Start async processing
  processExport(exportRecord.id, exportType, tableName, filters, admin).catch((err) => {
    console.error("[reports POST] Export processing error:", err);
  });

  await logAudit({
    user_id: session.userId,
    action: "DATA_EXPORT_CREATED",
    table_name: "data_exports",
    record_id: exportRecord.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, export: exportRecord });
}

async function processExport(
  exportId: string,
  exportType: string,
  tableName: string | null,
  filters: Json | null,
  admin: ReturnType<typeof getSupabaseAdmin>
) {
  try {
    await admin.from("data_exports").update({ status: "running" }).eq("id", exportId);

    let query = admin.from(tableName || "profiles").select("*");

    if (filters && typeof filters === "object") {
      const f = filters as Record<string, unknown>;
      if (f.campus_id) query = query.eq("campus_id", String(f.campus_id));
      if (f.grade_level) query = query.eq("grade_level", String(f.grade_level));
      if (f.status) query = query.eq("status", String(f.status));
      if (f.date_from) query = query.gte("created_at", String(f.date_from));
      if (f.date_to) query = query.lte("created_at", String(f.date_to));
    }

    const { data, error } = await query;

    if (error) throw error;

    let fileContent: string;
    let contentType: string;

    if (exportType === "json") {
      fileContent = JSON.stringify(data || [], null, 2);
      contentType = "application/json";
    } else if (exportType === "csv") {
      fileContent = arrayToCsv(data || []);
      contentType = "text/csv";
    } else {
      fileContent = JSON.stringify(data || [], null, 2);
      contentType = "application/json";
    }

    const blob = new Blob([fileContent], { type: contentType });
    const fileSize = blob.size;

    // Store in Supabase Storage (simulated - in production, upload to a bucket)
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

async function handleRunReport(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const reportType = String(body.report_type || "").trim();
  const filters = body.filters as Record<string, unknown> | null;

  if (!VALID_REPORT_TYPES.includes(reportType)) {
    throw new ValidationError(`Invalid report type: ${reportType}`);
  }

  let data: unknown[] = [];
  let count = 0;

  switch (reportType) {
    case "students": {
      let q = admin.from("students").select("*, profiles!inner(*)", { count: "exact" });
      if (filters?.campus_id) q = q.eq("campus_id", String(filters.campus_id));
      if (filters?.grade_level) q = q.eq("grade_level", String(filters.grade_level));
      if (filters?.status) q = q.eq("status", String(filters.status));
      const res = await q;
      data = res.data || [];
      count = res.count || 0;
      break;
    }
    case "staff": {
      let q = admin.from("staff").select("*, profiles!inner(*)", { count: "exact" });
      if (filters?.department) q = q.eq("department", String(filters.department));
      if (filters?.status) q = q.eq("status", String(filters.status));
      const res = await q;
      data = res.data || [];
      count = res.count || 0;
      break;
    }
    case "attendance": {
      let q = admin.from("attendance").select("*", { count: "exact" });
      if (filters?.date_from) q = q.gte("date", String(filters.date_from));
      if (filters?.date_to) q = q.lte("date", String(filters.date_to));
      if (filters?.status) q = q.eq("status", String(filters.status));
      const res = await q;
      data = res.data || [];
      count = res.count || 0;
      break;
    }
    case "grades": {
      let q = admin.from("grades").select("*", { count: "exact" });
      if (filters?.student_id) q = q.eq("student_id", String(filters.student_id));
      if (filters?.subject_id) q = q.eq("subject_id", String(filters.subject_id));
      if (filters?.term) q = q.eq("term", String(filters.term));
      const res = await q;
      data = res.data || [];
      count = res.count || 0;
      break;
    }
    case "fees": {
      let q = admin.from("fee_structures").select("*", { count: "exact" });
      if (filters?.campus_id) q = q.eq("campus_id", String(filters.campus_id));
      if (filters?.grade_level) q = q.eq("grade_level", String(filters.grade_level));
      if (filters?.term) q = q.eq("term", String(filters.term));
      const res = await q;
      data = res.data || [];
      count = res.count || 0;
      break;
    }
    default:
      throw new ValidationError(`Report type "${reportType}" not yet implemented`);
  }

  await logAudit({
    user_id: session.userId,
    action: "REPORT_RUN",
    table_name: "data_exports",
    new_data: { report_type: reportType, filters, count },
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, data, count, report_type: reportType });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Template ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: existing } = await admin
      .from("report_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    if (existing.created_by !== session.userId) {
      return NextResponse.json({ error: "You can only edit your own templates" }, { status: 403 });
    }

    const updateData: Partial<ReportTemplate> = {};
    if (updates.name !== undefined) updateData.name = String(updates.name).trim();
    if (updates.description !== undefined) updateData.description = updates.description ? String(updates.description).trim() : null;
    if (updates.report_type !== undefined) {
      const rt = String(updates.report_type).trim();
      if (!VALID_REPORT_TYPES.includes(rt)) {
        return NextResponse.json({ error: `Invalid report type: ${rt}` }, { status: 400 });
      }
      updateData.report_type = rt;
    }
    if (updates.config !== undefined) updateData.config = updates.config as Json;
    if (updates.is_shared !== undefined) updateData.is_shared = Boolean(updates.is_shared);

    const { error } = await admin.from("report_templates").update(updateData).eq("id", id);

    if (error) {
      console.error("[reports PATCH] Update error:", error.message);
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "REPORT_TEMPLATE_UPDATED",
      table_name: "report_templates",
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
    console.error("[reports PATCH] Unhandled error:", error);
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
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ error: "ID and type required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (type === "template") {
      const { data: existing } = await admin
        .from("report_templates")
        .select("created_by")
        .eq("id", id)
        .single();

      if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });
      if (existing.created_by !== session.userId) {
        return NextResponse.json({ error: "You can only delete your own templates" }, { status: 403 });
      }

      const { error } = await admin.from("report_templates").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
      }

      await logAudit({
        user_id: session.userId,
        action: "REPORT_TEMPLATE_DELETED",
        table_name: "report_templates",
        record_id: id,
        ip_address: getClientIP(req),
      });
    } else if (type === "export") {
      const { error } = await admin.from("data_exports").delete().eq("id", id).eq("created_by", session.userId);
      if (error) {
        return NextResponse.json({ error: "Failed to delete export" }, { status: 500 });
      }

      await logAudit({
        user_id: session.userId,
        action: "DATA_EXPORT_DELETED",
        table_name: "data_exports",
        record_id: id,
        ip_address: getClientIP(req),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[reports DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
