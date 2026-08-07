import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStaff } from "@/lib/auth";
import { createHeadteacherSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = createHeadteacherSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { email, full_name, phone, campus_id } = parseResult.data;
    const admin = getSupabaseAdmin();

    // Check if any admin already exists
    const { data: existingAdmin } = await admin
      .from("profiles")
      .select("id")
      .eq("user_category", "admin")
      .limit(1)
      .single();

    if (existingAdmin) {
      return NextResponse.json({ error: "An admin already exists. Please contact them to create additional accounts." }, { status: 403 });
    }

    // Create headteacher as admin
    const result = await createStaff({
      email,
      fullName: full_name,
      phone,
      campusId: campus_id,
      department: "Administration",
      designation: "Headteacher",
      permissionIds: [], // Admin gets all permissions implicitly
      createdBy: "system",
    });

    // Upgrade to admin
    await admin
      .from("profiles")
      .update({ role: "admin", user_category: "admin" })
      .eq("id", result.staffId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/onboarding/create-headteacher] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create headteacher" }, { status: 500 });
  }
}
