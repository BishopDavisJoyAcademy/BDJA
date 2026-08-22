import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing Supabase server environment variables");
}

const BASE_URL = SUPABASE_URL! + "/rest/v1/inventory_items";

function getHeaders(): Record<string, string> {
  return {
    "apikey": SERVICE_KEY!,
    "Authorization": "Bearer " + SERVICE_KEY!,
    "Content-Type": "application/json",
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "inventory.view");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const res = await fetch(BASE_URL + "?id=eq." + encodeURIComponent(id) + "&limit=1", {
        headers: getHeaders(),
      });
      if (!res.ok) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      const data = await res.json();
      return NextResponse.json({ item: data[0] || null });
    }

    const res = await fetch(BASE_URL + "?order=created_at.desc", { headers: getHeaders() });
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ items: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "inventory.create");
    const body = await req.json();

    if (!body.name || !body.category) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    const payload = {
      name: body.name,
      description: body.description || null,
      category: body.category,
      quantity: body.quantity || 0,
      unit: body.unit || "pcs",
      location: body.location || null,
      condition: body.condition || "good",
      assigned_to: body.assigned_to || null,
      purchase_date: body.purchase_date || null,
      purchase_cost: body.purchase_cost || null,
      supplier: body.supplier || null,
      serial_number: body.serial_number || null,
      barcode: body.barcode || null,
      is_active: body.is_active ?? true,
      created_by: session.userId,
    };

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { ...getHeaders(), "Prefer": "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create item" }));
      return NextResponse.json({ error: err.message || "Failed to create item" }, { status: 500 });
    }

    const data = await res.json();

    await logAudit({
      user_id: session.userId,
      action: "INVENTORY_ITEM_CREATED",
      table_name: "inventory_items",
      record_id: data[0]?.id,
      new_data: payload,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, item: data[0] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "inventory.edit");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    const body = await req.json();

    const getRes = await fetch(BASE_URL + "?id=eq." + encodeURIComponent(id) + "&limit=1", {
      headers: getHeaders(),
    });
    if (!getRes.ok) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    const existing = (await getRes.json())[0];
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const payload = {
      name: body.name,
      description: body.description || existing.description,
      category: body.category,
      quantity: body.quantity ?? existing.quantity,
      unit: body.unit || existing.unit,
      location: body.location || existing.location,
      condition: body.condition || existing.condition,
      assigned_to: body.assigned_to || existing.assigned_to,
      purchase_date: body.purchase_date || existing.purchase_date,
      purchase_cost: body.purchase_cost ?? existing.purchase_cost,
      supplier: body.supplier || existing.supplier,
      serial_number: body.serial_number || existing.serial_number,
      barcode: body.barcode || existing.barcode,
      is_active: body.is_active ?? existing.is_active,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(BASE_URL + "?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: { ...getHeaders(), "Prefer": "return=minimal" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return NextResponse.json({ error: "Failed to update item" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "INVENTORY_ITEM_UPDATED",
      table_name: "inventory_items",
      record_id: id,
      old_data: existing,
      new_data: payload,
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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "inventory.delete");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

    const res = await fetch(BASE_URL + "?id=eq." + encodeURIComponent(id), {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!res.ok) return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: "INVENTORY_ITEM_DELETED",
      table_name: "inventory_items",
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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
