import { UserRole } from '@/types';

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
  editPages: boolean;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, PermissionSet> = {
  student: {
    editPages: false, viewDashboard: true, viewStudents: false, editStudents: false,
    viewGrades: true, editGrades: false, viewAttendance: true, editAttendance: false,
    viewTimetable: true, editTimetable: false, viewCalendar: true, editCalendar: false,
    viewAssignments: true, editAssignments: false, viewVora: true, editVora: false,
    viewLibrary: true, editLibrary: false, viewFees: false, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: false, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  parent: {
    editPages: false, viewDashboard: true, viewStudents: false, editStudents: false,
    viewGrades: true, editGrades: false, viewAttendance: true, editAttendance: false,
    viewTimetable: true, editTimetable: false, viewCalendar: true, editCalendar: false,
    viewAssignments: true, editAssignments: false, viewVora: true, editVora: false,
    viewLibrary: true, editLibrary: false, viewFees: true, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: false, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  teacher: {
    editPages: false, viewDashboard: true, viewStudents: true, editStudents: false,
    viewGrades: true, editGrades: true, viewAttendance: true, editAttendance: true,
    viewTimetable: true, editTimetable: true, viewCalendar: true, editCalendar: true,
    viewAssignments: true, editAssignments: true, viewVora: true, editVora: true,
    viewLibrary: true, editLibrary: false, viewFees: false, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: true, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  class_prefect: {
    editPages: false, viewDashboard: true, viewStudents: true, editStudents: false,
    viewGrades: false, editGrades: false, viewAttendance: true, editAttendance: true,
    viewTimetable: true, editTimetable: false, viewCalendar: true, editCalendar: false,
    viewAssignments: true, editAssignments: false, viewVora: true, editVora: false,
    viewLibrary: true, editLibrary: false, viewFees: false, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: false, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  bursar: {
    editPages: false, viewDashboard: true, viewStudents: false, editStudents: false,
    viewGrades: false, editGrades: false, viewAttendance: false, editAttendance: false,
    viewTimetable: false, editTimetable: false, viewCalendar: false, editCalendar: false,
    viewAssignments: false, editAssignments: false, viewVora: false, editVora: false,
    viewLibrary: false, editLibrary: false, viewFees: true, editFees: true,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: true, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  librarian: {
    editPages: false, viewDashboard: true, viewStudents: false, editStudents: false,
    viewGrades: false, editGrades: false, viewAttendance: false, editAttendance: false,
    viewTimetable: false, editTimetable: false, viewCalendar: false, editCalendar: false,
    viewAssignments: false, editAssignments: false, viewVora: false, editVora: false,
    viewLibrary: true, editLibrary: true, viewFees: false, editFees: false,
    viewMessages: true, sendMessages: true, viewAdmissions: false, editAdmissions: false,
    viewAnalytics: true, manageUsers: false, manageRoles: false,
    broadcastAnnouncements: false, viewAuditLogs: false, crossCampusAccess: false,
  },
  principal: {
    editPages: true, viewDashboard: true, viewStudents: true, editStudents: true,
    viewGrades: true, editGrades: true, viewAttendance: true, editAttendance: true,
    viewTimetable: true, editTimetable: true, viewCalendar: true, editCalendar: true,
    viewAssignments: true, editAssignments: true, viewVora: true, editVora: true,
    viewLibrary: true, editLibrary: true, viewFees: true, editFees: true,
    viewMessages: true, sendMessages: true, viewAdmissions: true, editAdmissions: true,
    viewAnalytics: true, manageUsers: true, manageRoles: true,
    broadcastAnnouncements: true, viewAuditLogs: true, crossCampusAccess: false,
  },
  super_admin: {
    editPages: true, viewDashboard: true, viewStudents: true, editStudents: true,
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

export const ROUTE_PERMISSIONS: Record<string, (keyof PermissionSet)[]> = {
  '/admin': ['manageUsers'],
  '/admin/users': ['manageUsers'],
  '/admin/analytics': ['viewAnalytics'],
  '/admin/audit': ['viewAuditLogs'],
  '/admin/subjects': ['manageRoles'],
  '/admin/content': ['manageUsers'],
  '/admin/campuses': ['manageUsers'],
  '/admin/pages': ['editPages'],
  '/bursar': ['viewFees'],
  '/fees': ['viewFees'],
  '/librarian': ['editLibrary'],
  '/library': ['viewLibrary'],
  '/teacher': ['editGrades'],
  '/grades': ['viewGrades'],
  '/attendance': ['viewAttendance'],
  '/timetable': ['viewTimetable'],
  '/assignments': ['viewAssignments'],
  '/admissions': ['viewAdmissions'],
  '/manage/admissions': ['viewAdmissions'],
  '/manage/calendar': ['viewCalendar'],
  '/manage/library': ['viewLibrary'],
  '/manage/vora': ['viewVora'],
  '/vora': ['viewVora'],
  '/calendar': ['viewCalendar'],
  '/messages': ['viewMessages'],
  '/parent': ['viewGrades'],
  '/student': ['viewDashboard'],
};

export function getRequiredPermission(pathname: string): (keyof PermissionSet)[] | null {
  for (const [route, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) return perms;
  }
  return null;
}
