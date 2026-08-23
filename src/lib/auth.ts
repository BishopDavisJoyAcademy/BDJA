import { getSupabaseAdmin } from "./supabase-server";
import { Database } from "@/types/database";
import { hashPassword, generateTempPassword, generatePIN } from "./security";
import { logAudit } from "./audit";
import { getErrorMessage } from "@/lib/errors";

function mapOldRole(oldRole: string): "student" | "parent" | "staff" | "admin" {
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

interface CreateUserOptions {
  email: string;
  password?: string;
  fullName: string;
  role?: "student" | "parent" | "staff" | "admin";
  userCategory?: "student" | "parent" | "staff" | "admin";
  campusId?: string;
  phone?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface CreateUserResult {
  userId: string;
  email: string;
  tempPassword: string;
  success: boolean;
}

export async function createUser(options: CreateUserOptions): Promise<CreateUserResult> {
  const password = options.password || generateTempPassword();
  let authUserId: string | null = null;
  const admin = getSupabaseAdmin();

  try {
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: options.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: options.fullName,
        role: options.role || "student",
        user_category: options.userCategory || options.role || "student",
        password_changed: false,
        ...options.metadata,
      },
    });

    if (authError || !authUser?.user) {
      throw new Error(authError?.message || "Failed to create auth user");
    }

    authUserId = authUser.user.id;

    // Wait for trigger
    await new Promise((resolve) => setTimeout(resolve, 500));

    const passwordHash = await hashPassword(password);

    // Upsert profile (trigger may have created it)
    const { error: upsertError } = await admin.from("profiles").upsert({
      id: authUserId,
      email: options.email,
      full_name: options.fullName,
      role: options.role || "student",
      user_category: options.userCategory || options.role || "student",
      campus_id: options.campusId || null,
      phone: options.phone || null,
      created_by: options.createdBy || null,
      temp_password_hash: passwordHash,
      password_changed: false,
      is_active: true,
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (upsertError) {
      throw new Error(`Profile upsert failed: ${upsertError.message}`);
    }

    // Password history
    try {
      type PasswordHistoryInsert = Database["public"]["Tables"]["password_history"]["Insert"];
    await admin.from("password_history").insert({ user_id: authUserId, password_hash: passwordHash } as PasswordHistoryInsert);
    } catch (err: unknown) {
      console.error("[auth] Password history insert failed:", err);
    }

    await logAudit({
      user_id: options.createdBy || authUserId,
      action: "USER_CREATED",
      table_name: "user",
      record_id: authUserId,
      new_data: { role: options.role, user_category: options.userCategory },
    }).catch(() => {});

    return { userId: authUserId, email: options.email, tempPassword: password, success: true };
  } catch (error: unknown) {
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch((err: unknown) => {
        console.error("[auth] Cleanup failed:", err);
      });
    }
    throw new Error(getErrorMessage(error) || "Failed to create user");
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

export interface CreateStaffResult {
  userId: string;
  staffId: string;
  email: string;
  tempPassword: string;
  success: boolean;
  message: string;
  error?: string;
}

export async function createStaff(options: CreateStaffOptions): Promise<CreateStaffResult> {
  const admin = getSupabaseAdmin();

  // Check email uniqueness via DB (not listing all users)
  const { data: existing } = await admin.from("profiles").select("id").eq("email", options.email.toLowerCase()).maybeSingle();
  if (existing) {
    return { userId: "", staffId: "", email: options.email, tempPassword: "", success: false, message: "A user with this email already exists", error: "A user with this email already exists" };
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

  type StaffInsert = Database["public"]["Tables"]["staff"]["Insert"];

  const { error: staffError } = await admin.from("staff").insert({
    id: userResult.userId,
    employee_id: options.email.split("@")[0].toUpperCase() + "-" + Date.now().toString().slice(-4),
    department: options.department || "General",
    designation: options.designation || "Staff",
    status: "active",
  } as StaffInsert);

  if (staffError) {
    console.error("[auth] Staff record creation failed:", staffError);
  }

  if (options.permissionIds && options.permissionIds.length > 0) {
    const permissionRecords = options.permissionIds.map((pid: string) => ({
      profile_id: userResult.userId,
      permission_id: pid,
      granted_by: options.createdBy,
    }));
    const { error: permError } = await admin.from("staff_permissions").insert(permissionRecords);
    if (permError) {
      console.error("[auth] Permission insert failed:", permError);
    }
  }

  await logAudit({
    user_id: options.createdBy,
    action: "STAFF_CREATED",
    table_name: "staff",
    record_id: userResult.userId,
    new_data: { department: options.department, designation: options.designation, permissions: options.permissionIds },
  }).catch(() => {});

  return { userId: userResult.userId, staffId: userResult.userId, email: userResult.email, tempPassword: userResult.tempPassword, success: true, message: "Staff created successfully" };
}

interface CreateStudentOptions {
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
  const pin = generatePIN();
  const admin = getSupabaseAdmin();

  const userResult = await createUser({
    email: options.email,
    password: pin,
    fullName: options.fullName,
    role: "student",
    userCategory: "student",
    campusId: options.campusId,
    phone: options.phone,
    createdBy: options.createdBy,
    metadata: { admission_number: options.admissionNumber, grade_level: options.gradeLevel },
  });

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
    table_name: "student",
    record_id: userResult.userId,
    new_data: { admission_number: options.admissionNumber, grade_level: options.gradeLevel },
  }).catch(() => {});

  return { ...userResult, studentId: userResult.userId, tempPassword: pin };
}

export async function restoreMissingProfile(userId: string, email?: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  try {
    console.log("[restoreMissingProfile] Starting for userId:", userId);

    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
    if (authError || !authUser.user) {
      console.error("[restoreMissingProfile] getUserById failed:", authError?.message);
      return false;
    }
    console.log("[restoreMissingProfile] Auth user found:", authUser.user.email, "meta:", JSON.stringify(authUser.user.user_metadata));

    const { data: existing } = await admin.from("profiles").select("id, is_active").eq("id", userId).limit(1);
    if (existing && existing.length > 0) {
      console.log("[restoreMissingProfile] Profile already exists");
      // CRITICAL FIX: If profile exists but is_active is NULL, heal it to true
      const existingProfile = existing[0] as { id: string; is_active: boolean | null } | undefined;
      if (existingProfile && existingProfile.is_active === null) {
        console.log("[restoreMissingProfile] Healing NULL is_active to true for:", userId);
        const { error: fixError } = await admin
          .from("profiles")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", userId);
        if (fixError) {
          console.error("[restoreMissingProfile] Heal is_active FAILED:", fixError.message);
        }
      }
      return true;
    }

    const role = authUser.user.user_metadata?.role || "student";
    const userCategory = mapOldRole(role);
    const passwordChanged = authUser.user.user_metadata?.password_changed === true;

    const insertData = {
      id: userId,
      email: authUser.user.email || email || "",
      full_name: authUser.user.user_metadata?.full_name || "User",
      role,
      user_category: userCategory,
      campus_id: authUser.user.user_metadata?.campus_id || null,
      is_active: true,
      password_changed: passwordChanged,
      onboarding_completed: false,
    };
    console.log("[restoreMissingProfile] Inserting profile:", JSON.stringify(insertData));

    const { error: insertError } = await admin.from("profiles").insert(insertData);
    if (insertError) {
      console.error("[restoreMissingProfile] Insert FAILED:", insertError.message, insertError.code, insertError.details);
      return false;
    }

    console.log("[restoreMissingProfile] Profile inserted successfully");
    return true;
  } catch (err: unknown) {
    console.error("[restoreMissingProfile] Exception:", getErrorMessage(err), err instanceof Error ? err.stack : undefined);
    return false;
  }
}
