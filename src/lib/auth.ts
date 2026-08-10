import { getSupabaseAdmin } from "./supabase-server";
import { hashPassword, generateTempPassword, generatePIN } from "./security";
import { logAudit } from "./audit";

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
      await admin.from("password_history").insert({ user_id: authUserId, password_hash: passwordHash } as { user_id: string; password_hash: string; created_at: string });
    } catch (err: any) {
      console.error("[auth] Password history insert failed:", err);
    }

    await logAudit({
      user_id: options.createdBy || authUserId,
      action: "USER_CREATED",
      target_type: "user",
      target_id: authUserId,
      metadata: { role: options.role, user_category: options.userCategory },
    }).catch(() => {});

    return { userId: authUserId, email: options.email, tempPassword: password, success: true };
  } catch (error: any) {
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch((err: any) => {
        console.error("[auth] Cleanup failed:", err);
      });
    }
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

export interface CreateStaffResult {
  userId: string;
  staffId: string;
  email: string;
  tempPassword: string;
  success: boolean;
}

export async function createStaff(options: CreateStaffOptions): Promise<CreateStaffResult> {
  const admin = getSupabaseAdmin();

  // Check email uniqueness via DB (not listing all users)
  const { data: existing } = await admin.from("profiles").select("id").eq("email", options.email.toLowerCase()).maybeSingle();
  if (existing) {
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

  const { error: staffError } = await admin.from("staff").insert({
    id: userResult.userId,
    employee_id: options.email.split("@")[0].toUpperCase() + "-" + Date.now().toString().slice(-4),
    department: options.department || "General",
    designation: options.designation || "Staff",
    status: "active",
  });

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
    target_type: "staff",
    target_id: userResult.userId,
    metadata: { department: options.department, designation: options.designation, permissions: options.permissionIds },
  }).catch(() => {});

  return { userId: userResult.userId, staffId: userResult.userId, email: userResult.email, tempPassword: userResult.tempPassword, success: true };
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
  const pin = generatePIN(4);
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
    target_type: "student",
    target_id: userResult.userId,
    metadata: { admission_number: options.admissionNumber, grade_level: options.gradeLevel },
  }).catch(() => {});

  return { ...userResult, studentId: userResult.userId, tempPassword: pin };
}

export async function restoreMissingProfile(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  try {
    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
    if (authError || !authUser.user) return false;

    const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (existing) return true;

    const role = authUser.user.user_metadata?.role || "student";
    const userCategory = mapOldRole(role);
    const { error: insertError } = await admin.from("profiles").insert({
      id: userId,
      email: authUser.user.email || "",
      full_name: authUser.user.user_metadata?.full_name || "User",
      role,
      user_category: userCategory,
      campus_id: authUser.user.user_metadata?.campus_id || null,
      is_active: true,
      password_changed: false,
      onboarding_completed: false,
    });

    return !insertError;
  } catch (err) {
    console.error("[auth] Restore profile failed:", err);
    return false;
  }
}
