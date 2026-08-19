import { getSupabaseAdmin } from "./supabase-server";
import { JoyContext } from "@/types/joy";
import { getUserPermissions } from "./permissions";

export async function buildJoyContext(userId: string): Promise<JoyContext> {
  const admin = getSupabaseAdmin();
  const ctx: JoyContext = {};

  // Profile
  interface JoyProfileRow {
    full_name: string;
    user_category: string;
    role: string;
    campus_id: string | null;
  }

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("full_name, user_category, role, campus_id")
    .eq("id", userId)
    .single();
  const profile = profileRaw as JoyProfileRow | null;

  if (profile) {
    ctx.userName = profile.full_name;
    ctx.userCategory = profile.user_category;
    ctx.campusId = profile.campus_id || undefined;
  }

  // Permissions
  try {
    const perms = await getUserPermissions(userId);
    ctx.availableActions = buildAvailableActions(profile?.user_category || "student", perms);
  } catch {
    ctx.availableActions = buildAvailableActions(profile?.user_category || "student", []);
  }

  // Student data
  if (profile?.user_category === "student") {
    interface JoyStudentRow {
      grade_level: string | null;
      class_id: string | null;
      admission_number: string | null;
    }

    const { data: studentRaw } = await admin
      .from("students")
      .select("grade_level, class_id, admission_number")
      .eq("profile_id", userId)
      .single();
    const student = studentRaw as JoyStudentRow | null;

    if (student) {
      ctx.gradeLevel = student.grade_level || undefined;
    }

    // Timetable
    if (student && student.class_id) {
      const { data: timetable } = await admin
        .from("timetable")
        .select("*, subjects(name), profiles(full_name)")
        .eq("class_id", student.class_id)
        .order("day_of_week", { ascending: true })
        .limit(20);
      ctx.timetable = timetable || [];
    } else {
      ctx.timetable = [];
    }

    // Grades
    const { data: grades } = await admin
      .from("assessments")
      .select("*, subjects(name)")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    ctx.grades = grades || [];

    // Assignments
    if (student && student.class_id) {
      const { data: assignments } = await admin
        .from("assignments")
        .select("*, subjects(name)")
        .eq("class_id", student.class_id)
        .gte("due_date", new Date().toISOString().split("T")[0])
        .order("due_date", { ascending: true })
        .limit(10);
      ctx.assignments = assignments || [];
    } else {
      ctx.assignments = [];
    }

    // Attendance
    const { data: attendance } = await admin
      .from("attendance")
      .select("*")
      .eq("student_id", userId)
      .order("date", { ascending: false })
      .limit(30);
    ctx.attendance = attendance || [];

    // Fees — calculate from fee_payments and fee_structures
    const { data: feePayments } = await admin
      .from("fee_payments")
      .select("amount, status, created_at")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (feePayments && feePayments.length > 0) {
      ctx.fees = feePayments.map((fp) => ({
        amount_paid: fp.amount,
        status: fp.status,
        date: fp.created_at,
      }));
    } else {
      ctx.fees = [];
    }
  }

  // Parent data
  if (profile?.user_category === "parent") {
    const { data: parentStudents } = await admin
      .from("parent_students")
      .select("student_id, relationship")
      .eq("parent_id", userId);

    if (parentStudents && parentStudents.length > 0) {
      const studentIds = parentStudents.map((ps) => ps.student_id).filter(Boolean);

      // Get student profiles
      const { data: childrenProfiles } = await admin
        .from("profiles")
        .select("id, full_name, user_category")
        .in("id", studentIds);

      // Get student records
      const { data: studentRecords } = await admin
        .from("students")
        .select("profile_id, grade_level, admission_number, class_id, classes(name)")
        .in("profile_id", studentIds);

      ctx.children = (childrenProfiles || []).map((cp) => {
        const sr = (studentRecords || []).find((s) => s.profile_id === cp.id);
        return {
          students: {
            full_name: cp.full_name,
            admission_number: sr?.admission_number,
            grade_level: sr?.grade_level,
            classes: sr?.classes,
          },
        };
      });

      // Get fee payments for children
      if (studentIds.length > 0) {
        const { data: childFees } = await admin
          .from("fee_payments")
          .select("amount, status, created_at, student_id")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false })
          .limit(10);
        ctx.fees = (childFees || []).map((f) => ({
          amount_paid: f.amount,
          status: f.status,
          date: f.created_at,
          student_id: f.student_id,
        }));
      }
    }
  }

  // Staff data
  if (profile?.user_category === "staff") {
    interface JoyStaffRow {
      designation: string | null;
      department: string | null;
    }
    const { data: staffRaw } = await admin
      .from("staff")
      .select("designation, department")
      .eq("id", userId)
      .single();
    const staff = staffRaw as JoyStaffRow | null;
    if (staff) {
      ctx.designation = staff.designation || undefined;
    }

    // Teaching schedule
    const { data: timetable } = await admin
      .from("timetable")
      .select("*, subjects(name), classes(name)")
      .eq("teacher_id", userId)
      .order("day_of_week", { ascending: true })
      .limit(20);
    ctx.timetable = timetable || [];
  }

  // Calendar events for all
  const { data: calendarEvents } = await admin
    .from("calendar_events")
    .select("*")
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })
    .limit(10);
  ctx.calendarEvents = calendarEvents || [];

  // VORA results — use thumbnail_url
  const { data: voraResults } = await admin
    .from("vora_content")
    .select("title, subject, grade_level, video_url, thumbnail_url")
    .limit(5);
  ctx.voraResults = (voraResults || []).map((v) => ({
    ...v,
    thumbnail: v.thumbnail_url,
  }));

  return ctx;
}

function buildAvailableActions(category: string, permissions: string[]): string[] {
  const actions: string[] = [];
  actions.push("Search the web and YouTube for educational content");
  actions.push("Navigate to different pages in the app");

  if (category === "student") {
    actions.push("View your timetable");
    actions.push("Check your grades");
    actions.push("View pending assignments");
    actions.push("Check your attendance");
    actions.push("View fee payments");
    actions.push("Watch VORA learning videos");
  }

  if (category === "parent") {
    actions.push("View your children's grades");
    actions.push("Check fee payments");
    actions.push("View upcoming events");
  }

  if (category === "staff" || category === "teacher") {
    actions.push("View your teaching schedule");
    actions.push("Create assignments");
    actions.push("Enter student marks");
    actions.push("Manage attendance");
    actions.push("Access the library");
  }

  if (category === "admin" || permissions.includes("admin_full_access")) {
    actions.push("Manage timetable");
    actions.push("Manage CMS pages");
    actions.push("View student analytics");
    actions.push("Manage admissions");
    actions.push("Send school-wide announcements");
    actions.push("Manage staff permissions");
    actions.push("Access all admin functions");
  }

  return actions;
}
