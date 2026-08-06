/**
 * POST /api/onboarding/create-headteacher
 *
 * Creates the first headteacher/principal account during platform onboarding.
 * This route is typically called once during initial setup.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const headteacherSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(100),
  phone: z.string().optional(),
  campus_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, any>;
    const parseResult = headteacherSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, full_name, phone, campus_id } = parseResult.data;
    const admin = getSupabaseAdmin();

    // Check if any principal/headteacher already exists
    const { data: existingPrincipals, error: countError } = await admin
      .from("profiles")
      .select("id")
      .in("role", ["principal", "super_admin"])
      .limit(1);

    if (countError) {
      console.error("[create-headteacher] Error checking existing principals:", countError);
      return NextResponse.json(
        { error: "Failed to verify existing accounts", code: "CHECK_FAILED" },
        { status: 500 }
      );
    }

    if (existingPrincipals && existingPrincipals.length > 0) {
      return NextResponse.json(
        { error: "A headteacher/principal account already exists. Use the admin panel to create additional accounts.", code: "ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase() + "!" + Math.floor(Math.random() * 100);

    // Create the headteacher using the new CreateUserOptions signature
    const newUser = await createUser({
      email,
      password: tempPassword,
      fullName: full_name,
      role: "principal",
      campusId: campus_id,
      phone: phone || undefined,
    });

    await logAudit({
      user_id: newUser.userId,
      action: "HEADTEACHER_CREATED",
      target_type: "profile",
      target_id: newUser.userId,
      metadata: { email, full_name, role: "principal", campus_id },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Headteacher account created successfully",
      userId: newUser.userId,
      email: newUser.email,
      temp_password: tempPassword,
      login_url: process.env.NEXT_PUBLIC_APP_URL || "https://bdja.ac.ke",
      note: "Please share the temporary password securely and require a password change on first login.",
    });
  } catch (error: any) {
    console.error("[create-headteacher] Error:", error);
    if (error.message?.includes("already been registered")) {
      return NextResponse.json(
        { error: "This email is already registered", code: "EMAIL_EXISTS" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
