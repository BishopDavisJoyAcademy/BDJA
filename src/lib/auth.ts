/**
 * BDJA Authentication Utilities v5.0
 * Ghost-free: all old roles collapsed to student/parent/staff/admin
 */

import { getSupabaseAdmin } from "./supabase-server";
import { logAudit } from "./audit";
import { addPasswordToHistory, SECURITY_CONFIG } from "./security";
import { grantPermissions } from "./permissions";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface CreateUserOptions {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "parent" | "staff" | "admin";
  userCategory: "student" | "parent" | "staff" | "admin";
  campusId?: string;
  phone?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface CreateUserResult {
  userId: string;
  email: string;
  tempPassword?: string;
}

export async function createUser(options: CreateUserOptions): Promise<CreateUserResult> {
  const admin = getSupabaseAdmin();
  const { email, password, fullName, role, userCategory, campusId, phone, metadata = {}, createdBy } = options;
  let authUserId: string | null = null;

  try {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        user_category: userCategory,
        campus_id: campusId,
        ...metadata,
      },
    });

    if (authError || !authData.user) {
      throw authError || new Error("Failed to create auth user");
    }

    authUserId = authData.user.id;
    await new Promise((r) => setTimeout(r, 100));

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", authUserId)
      .single();

    if (existingProfile) {
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          full_name: fullName,
          role,
          user_category: userCategory,
          campus_id: campusId || null,
          phone: phone || null,
          is_active: true,
          password_changed: false,
          onboarding_completed: false,
          temp_password_hash: await hashPassword(password),
        })
        .eq("id", authUserId);
      if (updateError) console.error("[auth] Profile update failed:", updateError);
    } else {
      const { error: insertError } = await admin.from("profiles").insert({
        id: authUserId,
        email,
        full_name: fullName,
        role,
        user_category: userCategory,
        campus_id: campusId || null,
        phone: phone || null,
        is_active: true,
        password_changed: false,
        onboarding_completed: false,
        temp_password_hash: await hashPassword(password),
      });
      if (insertError) throw insertError;
    }

    const passwordHash = await hashPassword(password);

    if (!authUserId) {
      throw new Error("Unexpected: authUserId is null after successful auth user creation");
    }
    await addPasswordToHistory(authUserId, passwordHash);

    await logAudit({
      user_id: createdBy || authUserId,
      action: "USER_CREATED",
      target_type: "profile",
      target_id: authUserId,
      metadata: { role, user_category: userCategory, email, campus_id: campusId },
    }).catch(() => {});

    return { userId: authUserId, email, tempPassword: password };
  } catch (error: any) {
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch((err: any) => {
        console.error("[auth] Cleanup failed - could not delete auth user:", err);
      });
    }
    console.error("[auth] User creation failed:", error);
    throw error;
  }
}

export interface CreateStaffOptions {
  email: string;
  fullName: string;
  phone?: string;
  department?: string;
  designation?: string;
  campusId?: string;
  permissionIds?: string[];
  createdBy: string;
}

export interface CreateStaffResult extends CreateUserResult {
  staffId: string;
}

export async function createStaff(options: CreateStaffOptions): Promise<CreateStaffResult> {
  const admin = getSupabaseAdmin();

  // Check if email already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const emailExists = existingUsers?.users?.some((u: any) => u.email?.toLowerCase() === options.email.toLowerCase());
  if (emailExists) {
    throw new Error("A user with this email already exists");
  }

  const tempPassword = generateTempPassword();
  const userResult = await createUser({
    email: options.email,
    password: tempPassword,
    fullName: options.fullName,
    role: "staff",
    userCategory: "staff",
    campusId: options.campusId,
    phone: options.phone,
    createdBy: options.createdBy,
  });

  if (!userResult.success) {
    throw new Error(userResult.error || "Failed to create user");
  }

  const { error: staffError } = await admin.from("staff").insert({
    id: userResult.userId,
    employee_id: options.email.split("@")[0].toUpperCase() + "-" + Date.now().toString().slice(-4),
    department: options.department || "General",
    designation: options.designation || "Staff",
    status: "active",
  });
  if (staffError) {
    console.error("[auth] Staff record creation failed:", staffError);
    // Don't throw - user was created, staff record is secondary
  }

  if (options.permissionIds && options.permissionIds.length > 0) {
    await grantPermissions(userResult.userId, options.permissionIds, options.createdBy);
  }

  await logAudit({
    user_id: options.createdBy,
    action: "STAFF_CREATED",
    target_type: "staff",
    target_id: userResult.userId,
    metadata: { department: options.department, designation: options.designation, permissions: options.permissionIds },
  }).catch(() => {});

  return { ...userResult, staffId: userResult.userId };
}

export interface CreateStudentOptions {
  email: string;
  fullName: string;
  phone?: string;
  admissionNumber: string;
  gradeLevel: string;
  classId?: string;
  campusId?: string;
  parentId?: string;
  createdBy: string;
}

export interface CreateStudentResult extends CreateUserResult {
  studentId: string;
}

export async function createStudent(options: CreateStudentOptions): Promise<CreateStudentResult> {
  const tempPassword = generateTempPassword();
  const userResult = await createUser({
    email: options.email,
    password: tempPassword,
    fullName: options.fullName,
    role: "student",
    userCategory: "student",
    campusId: options.campusId,
    phone: options.phone,
    createdBy: options.createdBy,
    metadata: {
      admission_number: options.admissionNumber,
      grade_level: options.gradeLevel,
    },
  });

  const admin = getSupabaseAdmin();

  const { error: studentError } = await admin.from("students").insert({
    id: userResult.userId,
    admission_number: options.admissionNumber,
    grade_level: options.gradeLevel,
    class_id: options.classId || null,
    enrollment_date: new Date().toISOString().split("T")[0],
    status: "active",
  });
  if (studentError) console.error("[auth] Student record creation failed:", studentError);

  if (options.parentId) {
    const { error: linkError } = await admin.from("parent_students").insert({
      parent_id: options.parentId,
      student_id: userResult.userId,
      relationship: "parent",
      is_primary: true,
    });
    if (linkError) console.error("[auth] Parent link failed:", linkError);
  }

  await logAudit({
    user_id: options.createdBy,
    action: "STUDENT_CREATED",
    target_type: "student",
    target_id: userResult.userId,
    metadata: { admission_number: options.admissionNumber, grade_level: options.gradeLevel },
  }).catch(() => {});

  return { ...userResult, studentId: userResult.userId };
}

export interface CreateParentOptions {
  email: string;
  fullName: string;
  phone?: string;
  studentId?: string;
  createdBy: string;
}

export interface CreateParentResult extends CreateUserResult {
  parentId: string;
}

export async function createParent(options: CreateParentOptions): Promise<CreateParentResult> {
  const tempPassword = generateTempPassword();
  const userResult = await createUser({
    email: options.email,
    password: tempPassword,
    fullName: options.fullName,
    role: "parent",
    userCategory: "parent",
    phone: options.phone,
    createdBy: options.createdBy,
  });

  const admin = getSupabaseAdmin();

  if (options.studentId) {
    const { error: linkError } = await admin.from("parent_students").insert({
      parent_id: userResult.userId,
      student_id: options.studentId,
      relationship: "parent",
      is_primary: true,
    });
    if (linkError) console.error("[auth] Student link failed:", linkError);
  }

  await logAudit({
    user_id: options.createdBy,
    action: "PARENT_CREATED",
    target_type: "parent",
    target_id: userResult.userId,
    metadata: { student_id: options.studentId },
  }).catch(() => {});

  return { ...userResult, parentId: userResult.userId };
}

export async function restoreMissingProfile(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  try {
    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
    if (authError || !authUser.user) {
      console.error("[auth] Cannot restore profile - auth user not found:", userId);
      return false;
    }
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();
    if (existingProfile) {
      console.log("[auth] Profile already exists for:", userId);
      return true;
    }

    // Map old roles to new simplified roles
    const rawRole = authUser.user.user_metadata?.role || "student";
    const role = mapOldRole(rawRole);
    const userCategory = authUser.user.user_metadata?.user_category ||
      (role === "student" ? "student" : role === "parent" ? "parent" : role === "admin" ? "admin" : "staff");

    const { error: insertError } = await admin.from("profiles").insert({
      id: userId,
      email: authUser.user.email || "",
      full_name: authUser.user.user_metadata?.full_name || "Restored User",
      role,
      user_category: userCategory,
      campus_id: authUser.user.user_metadata?.campus_id || null,
      is_active: true,
      password_changed: true,
      onboarding_completed: true,
    });
    if (insertError) {
      console.error("[auth] Failed to restore profile:", insertError);
      return false;
    }
    console.log("[auth] Profile restored for:", userId);
    return true;
  } catch (error: any) {
    console.error("[auth] Profile restoration error:", error);
    return false;
  }
}

/**
 * Map legacy roles to the new simplified role system.
 * teacher, class_prefect, bursar, librarian -> staff
 * principal, super_admin -> admin
 */
export function mapOldRole(oldRole: string): "student" | "parent" | "staff" | "admin" {
  switch (oldRole) {
    case "student": return "student";
    case "parent": return "parent";
    case "teacher":
    case "class_prefect":
    case "bursar":
    case "librarian":
      return "staff";
    case "principal":
    case "super_admin":
      return "admin";
    default:
      return "student";
  }
}

export async function getAllUsersWithStatus() {
  const admin = getSupabaseAdmin();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("*, students(*), staff(*)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[auth] Failed to get users:", error);
    return [];
  }
  return profiles || [];
}
