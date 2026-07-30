import { supabaseAdmin } from "./supabase-server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;
if (!DEFAULT_PASSWORD) {
  throw new Error("DEFAULT_PASSWORD environment variable is required");
}

export function generateTempPassword(): string {
  // 10-character alphanumeric temp password
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: string,
  campusId?: string,
  extra?: Record<string, any>
) {
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (authError || !authUser.user) {
    throw authError || new Error("Failed to create user");
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    role,
    campus_id: campusId || null,
    password_changed: false,
    onboarding_completed: false,
    is_active: true,
    ...extra,
  });

  if (profileError) {
    // Rollback auth user if profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw profileError;
  }

  return authUser.user;
}

export async function createStudentWithParent(
  studentData: {
    email: string;
    full_name: string;
    admission_number: string;
    class_id: string;
    campus_id: string;
    grade_level: string;
  },
  parentData?: {
    name: string;
    email: string;
    phone?: string;
  }
) {
  const tempPassword = generateTempPassword();
  const hashedTemp = await hashPassword(tempPassword);

  const studentUser = await createUser(
    studentData.email,
    tempPassword,
    studentData.full_name,
    "student",
    studentData.campus_id,
    { temp_password_hash: hashedTemp }
  );

  // Create student record
  const { error: studentError } = await supabaseAdmin.from("students").insert({
    profile_id: studentUser.id,
    admission_number: studentData.admission_number,
    class_id: studentData.class_id,
    campus_id: studentData.campus_id,
    enrollment_date: new Date().toISOString(),
    status: "active",
  });

  if (studentError) throw studentError;

  let parentUserId: string | null = null;

  // Create parent if provided
  if (parentData?.email) {
    const parentTempPassword = generateTempPassword();
    const parentHashedTemp = await hashPassword(parentTempPassword);

    const parentUser = await createUser(
      parentData.email,
      parentTempPassword,
      parentData.name,
      "parent",
      studentData.campus_id,
      { temp_password_hash: parentHashedTemp }
    );
    parentUserId = parentUser.id;

    // Link parent to student
    await supabaseAdmin.from("parent_children").insert({
      parent_id: parentUser.id,
      student_id: studentUser.id,
      relationship: "parent",
    });

    return {
      student: {
        id: studentUser.id,
        email: studentData.email,
        name: studentData.full_name,
        admission_number: studentData.admission_number,
        temp_password: tempPassword,
      },
      parent: {
        id: parentUser.id,
        email: parentData.email,
        name: parentData.name,
        temp_password: parentTempPassword,
      },
    };
  }

  return {
    student: {
      id: studentUser.id,
      email: studentData.email,
      name: studentData.full_name,
      admission_number: studentData.admission_number,
      temp_password: tempPassword,
    },
    parent: null,
  };
}

export async function resetPassword(userId: string, newPassword: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw error;
  await supabaseAdmin.from("profiles").update({
    password_changed: true,
    temp_password_hash: null,
    last_password_change: new Date().toISOString(),
  }).eq("id", userId);
}

export async function requirePasswordChange(userId: string) {
  await supabaseAdmin.from("profiles").update({ password_changed: false }).eq("id", userId);
}
