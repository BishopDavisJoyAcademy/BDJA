import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStaff } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, phone, campusId } = body;

    if (!email || !fullName) {
      return NextResponse.json({ error: "Email and full name required" }, { status: 400 });
    }

    const result = await createStaff({
      email,
      fullName,
      phone,
      department: "Administration",
      designation: "Super Admin",
      campusId,
      createdBy: "system-onboarding",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || result.message }, { status: 500 });
    }

    // Promote to super admin role
    const admin = getSupabaseAdmin();
    await admin.from("profiles").update({
      role: "admin",
      user_category: "admin",
    }).eq("id", result.userId);

    return NextResponse.json({ success: true, userId: result.userId });
  } catch (err: unknown) {
    console.error("[setup-super-admin] Error:", getErrorMessage(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
