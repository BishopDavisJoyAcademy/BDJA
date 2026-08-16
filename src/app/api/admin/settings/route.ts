import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "settings.manage");
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("platform_settings").select("*").maybeSingle();
    if (error) return NextResponse.json({ settings: null });
    return NextResponse.json({ settings: data });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "settings.manage");
    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { data: existing } = await admin.from("platform_settings").select("id").maybeSingle();
    if (existing) {
      const { error } = await admin.from("platform_settings").update({ ...body, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    } else {
      const { error } = await admin.from("platform_settings").insert([{ ...body, updated_at: new Date().toISOString() }]);
      if (error) return NextResponse.json({ error: "Failed to create settings" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
