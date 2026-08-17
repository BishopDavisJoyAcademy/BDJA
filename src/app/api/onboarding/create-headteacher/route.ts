import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStaff } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, phone, department, designation, campusId } = body;

    if (!email || !fullName) {
      return NextResponse.json({ error: "Email and full name required" }, { status: 400 });
    }

    // For onboarding, we use a placeholder createdBy since no admin exists yet
    const result = await createStaff({
      email,
      fullName,
      phone,
      department: department || "Administration",
      designation: designation || "Head Teacher",
      campusId,
      createdBy: "system-onboarding",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || result.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: result.userId });
  } catch (err: unknown) {
    console.error("[create-headteacher] Error:", getErrorMessage(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
