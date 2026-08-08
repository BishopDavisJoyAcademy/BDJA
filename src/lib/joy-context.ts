import { getSupabaseAdmin } from "./supabase-server";
import { JoyContext } from "@/types/joy";

export async function buildJoyContext(userId: string): Promise<JoyContext> {
  const admin = getSupabaseAdmin();
  const ctx: JoyContext = {};

  // Profile
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, user_category, role, campus_id")
    .eq("id", userId)
    .single();

  if (profile) {
    ctx.userName = profile.full_name;
    ctx.userCategory = profile.user_category;
    ctx.campusId = profile.campus_id;
  }

  // Student data
  if (profile?.user_category === "student") {
    const { data: student } = await admin
      .from("students")
      .select("grade_level, class_id, admission_number")
      .eq("profile_id", userId)
      .single();
    if (student) {
      ctx.gradeLevel = student.grade_level;
    }

    // Timetable
    const { data: timetable } = await admin
      .from("timetable")
      .select("*, subjects(name), profiles(full_name)")
      .eq("class_id", student?.class_id)
      .order("day_of_week", { ascending: true })
      .limit(20);
    ctx.timetable = timetable || [];

    // Grades
    const { data: grades } = await admin
      .from("assessments")
      .select("*, subjects(name)")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    ctx.grades = grades || [];

    // Assignments
    const { data: assignments } = await admin
      .from("assignments")
      .select("*, subjects(name)")
      .eq("class_id", student?.class_id)
      .order("due_date", { ascending: true })
      .limit(10);
    ctx.assignments = assignments || [];

    // Attendance
    const { data: attendance } = await admin
      .from("attendance")
      .select("*")
      .eq("student_id", userId)
      .order("date", { ascending: false })
      .limit(30);
    ctx.attendance = attendance || [];

    // Fees
    const { data: fees } = await admin
      .from("fee_payments")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    ctx.fees = fees || [];
  }

  // Parent data
  if (profile?.user_category === "parent") {
    const { data: children } = await admin
      .from("parent_children")
      .select("*, students(*, classes(name))")
      .eq("parent_id", userId);
    ctx.children = children || [];

    if (children && children.length > 0) {
      const childIds = children.map((c: any) => c.student_id);

      const { data: grades } = await admin
        .from("assessments")
        .select("*, subjects(name)")
        .in("student_id", childIds)
        .order("created_at", { ascending: false })
        .limit(10);
      ctx.grades = grades || [];

      const { data: fees } = await admin
        .from("fee_payments")
        .select("*")
        .in("student_id", childIds)
        .order("created_at", { ascending: false })
        .limit(5);
      ctx.fees = fees || [];

      const { data: attendance } = await admin
        .from("attendance")
        .select("*")
        .in("student_id", childIds)
        .order("date", { ascending: false })
        .limit(30);
      ctx.attendance = attendance || [];
    }
  }

  // Staff data
  if (profile?.user_category === "staff") {
    const { data: staff } = await admin
      .from("staff")
      .select("designation, department")
      .eq("id", userId)
      .single();
    if (staff) {
      ctx.designation = staff.designation;
    }

    // Classes they teach
    const { data: classes } = await admin
      .from("class_subjects")
      .select("*, classes(name, grade_level), subjects(name)")
      .eq("teacher_id", userId);
    ctx.timetable = classes || [];

    // Pending assignments they created
    const { data: assignments } = await admin
      .from("assignments")
      .select("*")
      .eq("teacher_id", userId)
      .order("due_date", { ascending: true })
      .limit(10);
    ctx.assignments = assignments || [];
  }

  // Calendar events (all users)
  const { data: events } = await admin
    .from("calendar_events")
    .select("*")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(10);
  ctx.calendarEvents = events || [];

  return ctx;
}
