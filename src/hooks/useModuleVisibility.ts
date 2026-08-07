"use client";

import { useAuth } from "./useAuth";

export function useModuleVisibility() {
  const { user } = useAuth();
  const isAdmin = user?.user_category === "admin";
  const isStaff = user?.user_category === "staff";
  const isStudent = user?.user_category === "student";
  const isParent = user?.user_category === "parent";
  const permissions = user?.permissions || [];

  const hasPerm = (key: string) => isAdmin || permissions.includes(key);

  return {
    showStudents: isAdmin || isStaff || isStudent,
    showGrades: isAdmin || isStaff || isStudent || hasPerm("grades.view") || hasPerm("grades.manage"),
    showAttendance: isAdmin || isStaff || isStudent || hasPerm("attendance.view") || hasPerm("attendance.manage"),
    showTimetable: isAdmin || isStaff || isStudent || hasPerm("timetable.view") || hasPerm("timetable.manage"),
    showAssignments: isAdmin || isStaff || isStudent || hasPerm("assignments.view") || hasPerm("assignments.manage"),
    showCalendar: true,
    showVora: isAdmin || isStaff || isStudent || hasPerm("vora.view") || hasPerm("vora.manage"),
    showLibrary: isAdmin || isStaff || isStudent || hasPerm("library.view") || hasPerm("library.manage"),
    showFees: isAdmin || isStaff || isStudent || hasPerm("fees.view") || hasPerm("fees.manage"),
    showMessages: true,
    showAdmissions: isAdmin || hasPerm("admissions.manage"),
    showAdminPanel: isAdmin,
    showGodMode: isAdmin && hasPerm("impersonate.users"),
    showSuggestions: true,
  };
}
