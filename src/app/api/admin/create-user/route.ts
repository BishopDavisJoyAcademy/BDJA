/**
 * POST /api/admin/create-user
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession, requireRole } from "@/lib/session";
import { createUserSchema } from "@/lib/validation";
import { createUser, createStudentWithParent } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";
import { getClientIP, extractDeviceInfo } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req) + ":create-user";
    const { success } = await rateLimit(identifier, { limit: 10, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }

    const session = await validateSession(req);
    if (session.error || !session.session) {
      return NextResponse.json(
        { error: session.error?.message || "Unauthorized", code: session.error?.code },
        { status: 401 }
      );
    }

    requireRole(session.session, ["principal", "super_admin"]);
    const adminId = session.session.userId;
    const adminRole = session.session.role;

    const body = await req.json() as Record<string, any>;
    const parseResult = createUserSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten(), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bdja.ac.ke";

    if (data.role === "student") {
      if (!data.admission_number || !data.class_id || !data.grade_level) {
        return NextResponse.json(
          { error: "Student requires admission_number, class_id, and grade_level", code: "MISSING_FIELDS" },
          { status: 400 }
        );
      }
      const result = await createStudentWithParent(
        {
          email: data.email,
          full_name: data.full_name,
          admission_number: data.admission_number,
          class_id: data.class_id,
          campus_id: data.campus_id || session.session.campusId || "",
          grade_level: data.grade_level,
        },
        data.parent_email ? { name: data.parent_name || "Parent", email: data.parent_email, phone: data.parent_phone } : undefined,
        adminId
      );
      await logAudit({
        user_id: adminId,
        action: "STUDENT_CREATED",
        target_type: "student",
        target_id: result.student.id,
        metadata: { admission_number: data.admission_number, has_parent: !!result.parent, created_by_role: adminRole },
        ip_address: getClientIP(req),
        user_agent: req.headers.get("user-agent") || undefined,
      });
      return NextResponse.json({
        success: true,
        student: { ...result.student, login_url: loginUrl },
        parent: result.parent ? { ...result.parent, login_url: loginUrl } : null,
      });
    }

    const newUser = await createUser({
      email: data.email,
      password: generateTempPassword(),
      fullName: data.full_name,
      role: data.role,
      campusId: data.campus_id || session.session.campusId || undefined,
      phone: data.phone,
      createdBy: adminId,
    });

    await logAudit({
      user_id: adminId,
      action: "USER_CREATED",
      target_type: "profile",
      target_id: newUser.userId,
      metadata: { role: data.role, email: data.email, created_by_role: adminRole },
      ip_address: getClientIP(req),
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      userId: newUser.userId,
      email: data.email,
      name: data.full_name,
      role: data.role,
      temp_password: newUser.tempPassword,
      login_url: loginUrl,
    });
  } catch (error: any) {
    console.error("[create-user] Error:", error);
    if (error.name === "AuthRequiredError") {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: error.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
