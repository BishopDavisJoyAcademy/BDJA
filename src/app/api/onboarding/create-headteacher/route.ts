import { NextRequest, NextResponse } from "next/server";
import { createClient, getSupabaseAdmin } from "@/lib/supabase-server";
import { hasPermission } from "@/lib/permissions";
import { createUserSchema } from "@/lib/validation";
import { generateTempPassword, createUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req) + ":create-headteacher";
    const { success } = await rateLimit(identifier, { limit: 5, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Auth check — v0.12.4: use async createClient with getAll/setAll
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await getSupabaseAdmin()
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !hasPermission(profile.role, "manageUsers")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validation
    const body = await req.json();
    const parseResult = createUserSchema.safeParse({ ...body, role: "principal" });
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { email, full_name, campus_id, phone } = parseResult.data;
    const tempPassword = generateTempPassword();

    const newUser = await createUser(email, tempPassword, full_name, "principal", campus_id, { phone: phone || null });

    await logAudit({
      user_id: user.id,
      action: "HEADTEACHER_CREATED",
      target_type: "profile",
      target_id: newUser.id,
      metadata: { email, full_name, campus_id },
      ip_address: req.headers.get("x-forwarded-for") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      userId: newUser.id,
      email,
      name: full_name,
      role: "principal",
      temp_password: tempPassword,
    });
  } catch (error: any) {
    console.error("Create headteacher error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
