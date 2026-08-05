/**
 * BDJA Authentication Utilities v3.0
 */

import { getSupabaseAdmin } from "./supabase-server";
import { logAudit } from "./audit";
import { addPasswordToHistory, SECURITY_CONFIG } from "./security";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export function generateTempPassword(): string {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
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
  role: string;
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
  const { email, password, fullName, role, campusId, phone, metadata = {}, createdBy } = options;
  let authUserId: string | null = null;

  try {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
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
    await addPasswordToHistory(authUserId!, passwordHash);

    await logAudit({
      user_id: createdBy || authUserId!,
      action: "USER_CREATED",
      target_type: "profile",
      target_id: authUserId!,
      metadata: { role, email, campus_id: campusId },
    }).catch(() => {});

    return { userId: authUserId!, email, tempPassword: password };
  } catch (error: any) {
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch((err) => {
        console.error("[auth] Cleanup failed - could not delete auth user:", err);
      });
    }
    console.error("[auth] User creation failed:", error);
    throw error;
  }
}

export interface StudentData {
  email: string;
  full_name: string;
  admission_number: string;
  class_id: string;
  campus_id: string;
  grade_level: string;
}

export interface ParentData {
  name: string;
  email: string;
  phone?: string;
}

export interface CreateStudentResult {
  student: { id: string; email: string; name: string; admission_number: string; temp_password: string };
  parent: { id: string; email: string; name: string; temp_password: string } | null;
}

export async function createStudentWithParent(
  studentData: StudentData,
  parentData?: ParentData,
  createdBy?: string
): Promise<CreateStudentResult> {
  const admin = getSupabaseAdmin();
  const tempPassword = generateTempPassword();
  const studentResult = await createUser({
    email: studentData.email,
    password: tempPassword,
    fullName: studentData.full_name,
    role: "student",
    campusId: studentData.campus_id,
    metadata: { temp_password_hash: await hashPassword(tempPassword) },
    createdBy,
  });

  const { error: studentError } = await admin.from("students").insert({
    profile_id: studentResult.userId,
    admission_number: studentData.admission_number,
    class_id: studentData.class_id,
    campus_id: studentData.campus_id,
    enrollment_date: new Date().toISOString(),
    status: "active",
  });

  if (studentError) {
    await admin.auth.admin.deleteUser(studentResult.userId).catch(() => {});
    throw studentError;
  }

  let parentResult: CreateStudentResult["parent"] = null;
  if (parentData?.email) {
    const parentTempPassword = generateTempPassword();
    const parentUser = await createUser({
      email: parentData.email,
      password: parentTempPassword,
      fullName: parentData.name,
      role: "parent",
      campusId: studentData.campus_id,
      phone: parentData.phone,
      createdBy,
    });
    await admin.from("parent_children").insert({
      parent_id: parentUser.userId,
      student_id: studentResult.userId,
      relationship: "parent",
    });
    parentResult = {
      id: parentUser.userId,
      email: parentData.email,
      name: parentData.name,
      temp_password: parentTempPassword,
    };
  }

  return {
    student: {
      id: studentResult.userId,
      email: studentData.email,
      name: studentData.full_name,
      admission_number: studentData.admission_number,
      temp_password: tempPassword,
    },
    parent: parentResult,
  };
}

export async function resetPassword(
  userId: string,
  newPassword: string,
  options?: { isFirstLogin?: boolean; changedBy?: string; ipAddress?: string; userAgent?: string }
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { isFirstLogin = false, changedBy, ipAddress, userAgent } = options || {};

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (updateError) throw updateError;

  const passwordHash = await hashPassword(newPassword);
  await addPasswordToHistory(userId, passwordHash);

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      password_changed: true,
      temp_password_hash: null,
      last_password_change: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profileError) console.error("[auth] Profile update after password reset failed:", profileError);

  await admin.from("account_lockouts").delete().eq("user_id", userId).catch(() => {});

  await logAudit({
    user_id: changedBy || userId,
    action: "PASSWORD_CHANGED",
    target_type: "profile",
    target_id: userId,
    metadata: { is_first_login: isFirstLogin },
    ip_address: ipAddress,
    user_agent: userAgent,
  }).catch(() => {});
}

export async function requirePasswordChange(userId: string, adminId?: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("profiles").update({ password_changed: false }).eq("id", userId);
  if (error) throw error;
  await logAudit({
    user_id: adminId || userId,
    action: "PASSWORD_CHANGE_REQUIRED",
    target_type: "profile",
    target_id: userId,
  }).catch(() => {});
}

export async function suspendUser(userId: string, adminId: string, reason: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("profiles").update({ is_active: false }).eq("id", userId);
  if (error) throw error;
  await admin
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: "account_suspended" })
    .eq("user_id", userId)
    .is("revoked_at", null);
  await logAudit({
    user_id: adminId,
    action: "ACCOUNT_SUSPENDED",
    target_type: "profile",
    target_id: userId,
    metadata: { reason },
  }).catch(() => {});
}

export async function reactivateUser(userId: string, adminId: string, reason: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("profiles").update({ is_active: true }).eq("id", userId);
  if (error) throw error;
  await admin.from("account_lockouts").delete().eq("user_id", userId).catch(() => {});
  await logAudit({
    user_id: adminId,
    action: "ACCOUNT_REACTIVATED",
    target_type: "profile",
    target_id: userId,
    metadata: { reason },
  }).catch(() => {});
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
    const { error: insertError } = await admin.from("profiles").insert({
      id: userId,
      email: authUser.user.email || "",
      full_name: authUser.user.user_metadata?.full_name || "Restored User",
      role: authUser.user.user_metadata?.role || "student",
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

export async function getAllUsersWithStatus() {
  const admin = getSupabaseAdmin();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select(`
      id, email, full_name, role, campus_id, is_active, password_changed, onboarding_completed, created_at,
      campuses (name),
      account_lockouts (failed_attempts, locked_until)
    `)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[auth] Failed to get users:", error);
    return [];
  }
  return profiles || [];
}
