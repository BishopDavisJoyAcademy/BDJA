import { getSupabaseAdmin } from "./supabase-server";
import { getErrorMessage } from "./errors";

export async function restoreMissingProfile(userId: string, email: string): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existing) return true;

    const { error } = await admin.from("profiles").insert([{
      id: userId,
      email,
      full_name: email.split("@")[0],
      role: "student",
      user_category: "student",
      is_active: true,
      password_changed: false,
      onboarding_completed: false,
    }]);

    if (error) {
      console.error("[restoreMissingProfile] Insert error:", error);
      return false;
    }
    return true;
  } catch (err: unknown) {
    console.error("[restoreMissingProfile] Exception:", getErrorMessage(err));
    return false;
  }
}

export interface CreateStaffInput {
  email: string;
  fullName: string;
  phone?: string;
  department?: string;
  designation?: string;
  campusId?: string;
  permissionIds?: string[];
  createdBy: string;
}

export interface CreateStaffResult {
  success: boolean;
  userId: string;
  message: string;
  error?: string;
}

export async function createStaff(input: CreateStaffInput): Promise<CreateStaffResult> {
  const admin = getSupabaseAdmin();

  try {
    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: Math.random().toString(36).slice(2, 10) + "A1!",
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return { success: false, userId: "", message: "Failed to create auth user", error: authError?.message };
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await admin.from("profiles").insert([{
      id: userId,
      email: input.email,
      full_name: input.fullName,
      role: "staff",
      user_category: "staff",
      phone: input.phone || null,
      campus_id: input.campusId || null,
      is_active: true,
      password_changed: false,
      onboarding_completed: false,
      created_by: input.createdBy,
    }]);

    if (profileError) {
      // Rollback auth user
      await admin.auth.admin.deleteUser(userId);
      return { success: false, userId: "", message: "Failed to create profile", error: profileError.message };
    }

    // Create staff record
    const { error: staffError } = await admin.from("staff").insert([{
      id: userId,
      department: input.department || "General",
      designation: input.designation || "Staff",
      employee_id: `EMP-${Date.now()}`,
      status: "active",
    }]);

    if (staffError) {
      console.error("[createStaff] Staff record error:", staffError);
      // Non-fatal: profile exists, staff record can be fixed later
    }

    // Grant permissions if provided
    if (input.permissionIds && input.permissionIds.length > 0) {
      const { error: permError } = await admin.from("staff_permissions").insert(
        input.permissionIds.map((pid) => ({
          profile_id: userId,
          permission_id: pid,
          granted_by: input.createdBy,
        }))
      );
      if (permError) {
        console.error("[createStaff] Permission grant error:", permError);
      }
    }

    return { success: true, userId, message: "Staff created successfully" };
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    return { success: false, userId: "", message: "Exception creating staff", error: msg };
  }
}
