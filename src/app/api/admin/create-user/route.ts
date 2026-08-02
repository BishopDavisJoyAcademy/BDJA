import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { hasPermission } from "@/lib/permissions";
import { createUserSchema } from "@/lib/validation";
import { generateTempPassword, createUser, createStudentWithParent } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req) + ":create-user";
    const { success } = await rateLimit(identifier, { limit: 10, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Auth check
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await getSupabaseAdmin()
      .from("profiles")
      .select("role, campus_id")
      .eq("id", session.user.id)
      .single();

    if (!adminProfile || !hasPermission(adminProfile.role, "manageUsers")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validation
    const body = await req.json();
    const parseResult = createUserSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const data = parseResult.data;
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bdja.ac.ke";

    // Student creation with parent
    if (data.role === "student") {
      if (!data.admission_number || !data.class_id || !data.grade_level) {
        return NextResponse.json({ error: "Student requires admission_number, class_id, and grade_level" }, { status: 400 });
      }

      const result = await createStudentWithParent(
        {
          email: data.email,
          full_name: data.full_name,
          admission_number: data.admission_number,
          class_id: data.class_id,
          campus_id: data.campus_id || adminProfile.campus_id || "",
          grade_level: data.grade_level,
        },
        data.parent_email ? {
          name: data.parent_name || "Parent",
          email: data.parent_email,
          phone: data.parent_phone,
        } : undefined
      );

      await logAudit({
        user_id: session.user.id,
        action: "STUDENT_CREATED",
        target_type: "student",
        target_id: result.student.id,
        metadata: { admission_number: data.admission_number, has_parent: !!result.parent },
        ip_address: req.headers.get("x-forwarded-for") || undefined,
        user_agent: req.headers.get("user-agent") || undefined,
      });

      return NextResponse.json({
        success: true,
        student: { ...result.student, login_url: loginUrl },
        parent: result.parent ? { ...result.parent, login_url: loginUrl } : null,
      });
    }

    // Staff/Other user creation
    const tempPassword = generateTempPassword();
    const user = await createUser(
      data.email,
      tempPassword,
      data.full_name,
      data.role,
      data.campus_id || adminProfile.campus_id || undefined,
      { phone: data.phone || null }
    );

    await logAudit({
      user_id: session.user.id,
      action: "USER_CREATED",
      target_type: "profile",
      target_id: user.id,
      metadata: { role: data.role, email: data.email },
      ip_address: req.headers.get("x-forwarded-for") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: data.email,
      name: data.full_name,
      role: data.role,
      temp_password: tempPassword,
      login_url: loginUrl,
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
