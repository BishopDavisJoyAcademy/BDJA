import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "inventory.view");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await admin
        .from("inventory_items")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      return NextResponse.json({ item: data });
    }

    const { data, error } = await admin
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }

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
    const admin = getSupabaseAdmin();

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

    const { data, error } = await admin
      .from("inventory_items")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to create item" },
        { status: 500 }
      );
    }

    await logAudit({
      user_id: session.userId,
      action: "INVENTORY_ITEM_CREATED",
      table_name: "inventory_items",
      record_id: data.id,
      new_data: payload,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, item: data });
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
    const admin = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await admin
      .from("inventory_items")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const payload = {
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      category: body.category ?? existing.category,
      quantity: body.quantity ?? existing.quantity,
      unit: body.unit ?? existing.unit,
      location: body.location ?? existing.location,
      condition: body.condition ?? existing.condition,
      assigned_to: body.assigned_to ?? existing.assigned_to,
      purchase_date: body.purchase_date ?? existing.purchase_date,
      purchase_cost: body.purchase_cost ?? existing.purchase_cost,
      supplier: body.supplier ?? existing.supplier,
      serial_number: body.serial_number ?? existing.serial_number,
      barcode: body.barcode ?? existing.barcode,
      is_active: body.is_active ?? existing.is_active,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("inventory_items")
      .update(payload)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }

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
    const admin = getSupabaseAdmin();

    const { error } = await admin
      .from("inventory_items")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }

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
