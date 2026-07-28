import { UserRole } from "@/types";

export interface PermissionSet {
  viewDashboard: boolean;
  viewStudents: boolean;
  editStudents: boolean;
  viewGrades: boolean;
  editGrades: boolean;
  viewAttendance: boolean;
  editAttendance: boolean;
  viewTimetable: boolean;
  editTimetable: boolean;
  viewCalendar: boolean;
  editCalendar: boolean;
  viewAssignments: boolean;
  editAssignments: boolean;
  viewVora: boolean;
  editVora: boolean;
  viewLibrary: boolean;
  editLibrary: boolean;
  viewFees: boolean;
  editFees: boolean;
  viewMessages: boolean;
  sendMessages: boolean;
  viewAdmissions: boolean;
  editAdmissions: boolean;
  viewAnalytics: boolean;
  manageUsers: boolean;
  manageRoles: boolean;
  broadcastAnnouncements: boolean;
  viewAuditLogs: boolean;
  crossCampusAccess: boolean;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, PermissionSet> = {
  student: {
    viewDashboard: true, viewStudents: false, editStudents: false,
    viewGrades: true, editGrades: false, viewAttendance: true, editAttendance: false,
    viewTimetable: true, editTimetable: false, viewCalendar: true, editCalendar: false,
    viewAssignments: true, editAssignments: false, viewVora: true, editVora: false,
    viewLibrary: true, editLibrary: false, viewFees: false, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: false, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  parent: {
    viewDashboard: true, viewStudents: false, editStudents: false,
    viewGrades: true, editGrades: false, viewAttendance: true, editAttendance: false,
    viewTimetable: true, editTimetable: false, viewCalendar: true, editCalendar: false,
    viewAssignments: true, editAssignments: false, viewVora: true, editVora: false,
    viewLibrary: true, editLibrary: false, viewFees: true, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: false, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  teacher: {
    viewDashboard: true, viewStudents: true, editStudents: false,
    viewGrades: true, editGrades: true, viewAttendance: true, editAttendance: true,
    viewTimetable: true, editTimetable: true, viewCalendar: true, editCalendar: true,
    viewAssignments: true, editAssignments: true, viewVora: true, editVora: true,
    viewLibrary: true, editLibrary: false, viewFees: false, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: true, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  class_prefect: {
    viewDashboard: true, viewStudents: true, editStudents: false,
    viewGrades: false, editGrades: false, viewAttendance: true, editAttendance: true,
    viewTimetable: true, editTimetable: false, viewCalendar: true, editCalendar: false,
    viewAssignments: true, editAssignments: false, viewVora: true, editVora: false,
    viewLibrary: true, editLibrary: false, viewFees: false, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: false, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  bursar: {
    viewDashboard: true, viewStudents: false, editStudents: false,
    viewGrades: false, editGrades: false, viewAttendance: false, editAttendance: false,
    viewTimetable: false, editTimetable: false, viewCalendar: false, editCalendar: false,
    viewAssignments: false, editAssignments: false, viewVora: false, editVora: false,
    viewLibrary: false, editLibrary: false, viewFees: true, editFees: true,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: true, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  librarian: {
    viewDashboard: true, viewStudents: false, editStudents: false,
    viewGrades: false, editGrades: false, viewAttendance: false, editAttendance: false,
    viewTimetable: false, editTimetable: false, viewCalendar: false, editCalendar: false,
    viewAssignments: false, editAssignments: false, viewVora: false, editVora: false,
    viewLibrary: true, editLibrary: true, viewFees: false, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: true, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  principal: {
    viewDashboard: true, viewStudents: true, editStudents: true,
    viewGrades: true, editGrades: true, viewAttendance: true, editAttendance: true,
    viewTimetable: true, editTimetable: true, viewCalendar: true, editCalendar: true,
    viewAssignments: true, editAssignments: true, viewVora: true, editVora: true,
    viewLibrary: true, editLibrary: true, viewFees: true, editFees: true,
    viewMessages: true, sendMessages: true, viewAdmissions: true, editAdmissions: true,
    viewAnalytics: true, manageUsers: true, manageRoles: true,
    broadcastAnnouncements: true, viewAuditLogs: true, crossCampusAccess: false,
  },
  super_admin: {
    viewDashboard: true, viewStudents: true, editStudents: true,
    viewGrades: true, editGrades: true, viewAttendance: true, editAttendance: true,
    viewTimetable: true, editTimetable: true, viewCalendar: true, editCalendar: true,
    viewAssignments: true, editAssignments: true, viewVora: true, editVora: true,
    viewLibrary: true, editLibrary: true, viewFees: true, editFees: true,
    viewMessages: true, sendMessages: true, viewAdmissions: true, editAdmissions: true,
    viewAnalytics: true, manageUsers: true, manageRoles: true,
    broadcastAnnouncements: true, viewAuditLogs: true, crossCampusAccess: true,
  },
};

export function getPermissions(role: UserRole, customPermissions?: Record<string, boolean>): PermissionSet {
  const defaults = DEFAULT_PERMISSIONS[role];
  if (!customPermissions) return defaults;
  return { ...defaults, ...customPermissions };
}

export function hasPermission(role: UserRole, permission: keyof PermissionSet, customPermissions?: Record<string, boolean>): boolean {
  return getPermissions(role, customPermissions)[permission];
}
