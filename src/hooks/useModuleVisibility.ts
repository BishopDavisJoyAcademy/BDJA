"use client";

import { useEffect, useMemo } from "react";
import { usePermissionStore } from "@/stores/permissions";

export interface ModuleVisibility {
  showStudents: boolean;
  showGrades: boolean;
  showAttendance: boolean;
  showTimetable: boolean;
  showAssignments: boolean;
  showCalendar: boolean;
  showFees: boolean;
  showLibrary: boolean;
  showVora: boolean;
  showAdmissions: boolean;
  showMessages: boolean;
  showAnalytics: boolean;
  showAudit: boolean;
  showStaff: boolean;
  showSettings: boolean;
  showPages: boolean;
  showAnnouncements: boolean;
}

export function useModuleVisibility(): ModuleVisibility {
  const { permissions, fetchPermissions } = usePermissionStore();

  useEffect(() => {
    if (permissions.length === 0) fetchPermissions();
  }, []);

  return useMemo(() => ({
    showStudents: permissions.includes("students.view") || permissions.includes("students.manage"),
    showGrades: permissions.includes("grades.view") || permissions.includes("grades.manage"),
    showAttendance: permissions.includes("attendance.view") || permissions.includes("attendance.manage"),
    showTimetable: permissions.includes("timetable.view") || permissions.includes("timetable.manage"),
    showAssignments: permissions.includes("assignments.view") || permissions.includes("assignments.manage"),
    showCalendar: permissions.includes("calendar.view") || permissions.includes("calendar.manage"),
    showFees: permissions.includes("fees.view") || permissions.includes("fees.manage"),
    showLibrary: permissions.includes("library.view") || permissions.includes("library.manage"),
    showVora: permissions.includes("vora.view") || permissions.includes("vora.manage"),
    showAdmissions: permissions.includes("admissions.view") || permissions.includes("admissions.manage"),
    showMessages: permissions.includes("messages.send"),
    showAnalytics: permissions.includes("analytics.view"),
    showAudit: permissions.includes("audit.view"),
    showStaff: permissions.includes("staff.view") || permissions.includes("staff.manage"),
    showSettings: permissions.includes("settings.manage"),
    showPages: permissions.includes("pages.edit"),
    showAnnouncements: permissions.includes("announcements.broadcast"),
  }), [permissions]);
}
