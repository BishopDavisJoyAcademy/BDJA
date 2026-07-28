import { supabaseAdmin } from "./supabase-server";
import bcrypt from "bcryptjs";

export const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "BDJA2026!";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(email: string, password: string, fullName: string, role: string, campusId?: string) {
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (authError || !authUser.user) throw authError || new Error("Failed to create user");

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    role,
    campus_id: campusId,
    password_changed: false,
    onboarding_completed: false,
  });

  if (profileError) throw profileError;

  return authUser.user;
}

export async function resetPassword(userId: string, newPassword: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw error;
  await supabaseAdmin.from("profiles").update({ password_changed: true }).eq("id", userId);
}

export async function requirePasswordChange(userId: string) {
  await supabaseAdmin.from("profiles").update({ password_changed: false }).eq("id", userId);
}
