import { createClient } from "@supabase/supabase-js";
import { hashPassword, verifyPassword } from "./security";
import { logAudit } from "./audit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

interface CreateUserOptions {
  email: string;
  password?: string;
  fullName: string;
  role?: string;
  userCategory?: string;
  campusId?: string;
  phone?: string;
  gradeLevel?: string;
  createdBy?: string;
}

interface CreateUserResult {
  userId: string;
  email: string;
  tempPassword: string;
  success: boolean;
  error?: string;
}

export async function createUser(options: CreateUserOptions): Promise<CreateUserResult> {
  const password = options.password || generateTempPassword();
  let authUserId: string | null = null;

  try {
    // Step 1: Create auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: options.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: options.fullName,
        role: options.role || "student",
        user_category: options.userCategory || "student",
      },
    });

    if (authError || !authUser?.user) {
      console.error("[auth] Auth user creation failed:", authError);
      throw new Error(authError?.message || "Failed to create auth user");
    }

    authUserId = authUser.user.id;

    // Step 2: Wait for trigger to fire
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 3: Check if profile exists (trigger may have created it)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    const passwordHash = await hashPassword(password);

    // Step 4: Update or insert profile
    if (existingProfile) {
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          email: options.email,
          full_name: options.fullName,
          role: options.role || "student",
          user_category: options.userCategory || "student",
          campus_id: options.campusId || null,
          phone: options.phone || null,
          created_by: options.createdBy || null,
          temp_password_hash: passwordHash,
          password_changed: false,
          is_active: true,
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUserId);

      if (updateError) {
        console.error("[auth] Profile update failed:", updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await admin.from("profiles").insert({
        id: authUserId,
        email: options.email,
        full_name: options.fullName,
        role: options.role || "student",
        user_category: options.userCategory || "student",
        campus_id: options.campusId || null,
        phone: options.phone || null,
        created_by: options.createdBy || null,
        temp_password_hash: passwordHash,
        password_changed: false,
        is_active: true,
        onboarding_completed: false,
      });

      if (insertError) {
        console.error("[auth] Profile insert failed:", insertError);
        throw new Error(`Profile insert failed: ${insertError.message}`);
      }
    }

    // Step 5: Add password to history
    await admin.from("password_history").insert({
      user_id: authUserId,
      password_hash: passwordHash,
    }).catch((err: any) => {
      console.error("[auth] Password history insert failed:", err);
    });

    // Step 6: Log audit
    await logAudit({
      user_id: options.createdBy || authUserId,
      action: "USER_CREATED",
      target_type: "user",
      target_id: authUserId,
      metadata: { role: options.role, user_category: options.userCategory },
    }).catch(() => {});

    return {
      userId: authUserId,
      email: options.email,
      tempPassword: password,
      success: true,
    };
  } catch (error: any) {
    // Cleanup: delete auth user if creation failed partway
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch((err: any) => {
        console.error("[auth] Cleanup failed - could not delete auth user:", err);
      });
    }
    console.error("[auth] User creation failed:", error);
    throw new Error(error.message || "Failed to create user");
  }
}

interface CreateStaffOptions {
  email: string;
  fullName: string;
  phone?: string;
  department?: string;
  designation?: string;
  campusId?: string;
  permissionIds?: string[];
  createdBy: string;
}

interface CreateStaffResult {
  userId: string;
  staffId: string;
  email: string;
  tempPassword: string;
  success: boolean;
  error?: string;
}

export async function createStaff(options: CreateStaffOptions): Promise<CreateStaffResult> {
  // Check if email already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const emailExists = existingUsers?.users?.some((u: any) => u.email?.toLowerCase() === options.email.toLowerCase());
  if (emailExists) {
    throw new Error("A user with this email already exists");
  }

  const userResult = await createUser({
    email: options.email,
    fullName: options.fullName,
    role: "staff",
    userCategory: "staff",
    campusId: options.campusId,
    phone: options.phone,
    createdBy: options.createdBy,
  });

  // Create staff record
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

  // Grant permissions
  if (options.permissionIds && options.permissionIds.length > 0) {
    const permissionRecords = options.permissionIds.map((pid: string) => ({
      user_id: userResult.userId,
      permission_id: pid,
    }));
    const { error: permError } = await admin.from("user_permissions").insert(permissionRecords);
    if (permError) {
      console.error("[auth] Permission insert failed:", permError);
    }
  }

  // Log audit
  await logAudit({
    user_id: options.createdBy,
    action: "STAFF_CREATED",
    target_type: "staff",
    target_id: userResult.userId,
    metadata: { department: options.department, designation: options.designation, permissions: options.permissionIds },
  }).catch(() => {});

  return {
    userId: userResult.userId,
    staffId: userResult.userId,
    email: userResult.email,
    tempPassword: userResult.tempPassword,
    success: true,
  };
}

export async function validateCredentials(email: string, password: string): Promise<boolean> {
  const { data: profile } = await admin
    .from("profiles")
    .select("temp_password_hash")
    .eq("email", email)
    .single();

  if (!profile?.temp_password_hash) return false;
  return verifyPassword(password, profile.temp_password_hash);
}

export async function checkPasswordHistory(userId: string, password: string): Promise<boolean> {
  const { data: history } = await admin
    .from("password_history")
    .select("password_hash")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!history) return false;
  for (const record of history) {
    if (await verifyPassword(password, record.password_hash)) return true;
  }
  return false;
}

export async function addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
  await admin.from("password_history").insert({
    user_id: userId,
    password_hash: passwordHash,
  });
}
