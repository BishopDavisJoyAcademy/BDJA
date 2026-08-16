// Common API response types used across the platform

export interface ApiListResponse<T> {
  [key: string]: T[] | undefined;
}

export interface ApiSingleResponse<T> {
  [key: string]: T | null | undefined;
}

export interface ApiSuccessResponse {
  success: boolean;
  message?: string;
}

// Admin stats
export interface AdminStats {
  students: number;
  staff: number;
  parents: number;
  pendingAdmissions: number;
}

// Audit logs
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  new_data: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  created_at: string | null;
  ip_address: string | null;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
}

// CMS Pages
export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  meta_keywords: string | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  last_edited_by: string | null;
}

export interface CmsPagesResponse {
  pages: CmsPage[];
  page?: CmsPage | null;
}

// Calendar events
export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string;
  target_audience: string;
  target_grade: string | null;
  campus_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  event?: CalendarEvent | null;
}

// Students
export interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  campus_id: string | null;
  students?: {
    admission_number: string;
    grade_level: string;
    class_id: string | null;
  };
}

export interface StudentsResponse {
  students: StudentProfile[];
  student?: StudentProfile | null;
}

// Staff
export interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  staff?: {
    department: string;
    designation: string;
    employee_id: string;
  };
}

export interface StaffResponse {
  staff: StaffProfile[];
  staffMember?: StaffProfile | null;
}

export interface StaffPermissionsResponse {
  permissions: Array<{
    id: string;
    key: string;
    name: string;
    category: string;
  }>;
}

// Suggestions
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string | null;
  status: string;
  user_id: string;
  admin_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

// Settings
export interface PlatformSettings {
  id?: string;
  school_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  timezone: string;
  academic_year: string;
  terms: Array<{ name: string; start: string; end: string }>;
  updated_at?: string | null;
}

export interface SettingsResponse {
  settings: PlatformSettings | null;
}

// Library
export interface LibraryResource {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  resource_type: string;
  grade_level: string | null;
  subject: string | null;
  url: string | null;
  file_path: string | null;
  is_published: boolean;
  created_at: string | null;
}

export interface LibraryResponse {
  resources: LibraryResource[];
  books?: LibraryResource[];
}

// Vora
export interface VoraContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  grade_level: string | null;
  subject: string | null;
  category: string;
  duration_seconds: number | null;
  is_published: boolean;
  created_at: string | null;
}

export interface VoraResponse {
  videos: VoraContent[];
  content?: VoraContent[];
}

// Teacher
export interface TeacherClass {
  id: string;
  name: string;
  grade_level: string;
  stream: string | null;
  academic_year: string;
  campus_id: string;
}

export interface TeacherClassesResponse {
  classes: TeacherClass[];
}

export interface TeacherSubject {
  id: string;
  name: string;
  code: string | null;
  grade_level: string | null;
}

export interface TeacherSubjectsResponse {
  subjects: TeacherSubject[];
}

// Errors
export interface RuntimeError {
  id: string;
  message: string;
  stack: string | null;
  component: string | null;
  url: string;
  user_id: string | null;
  user_email: string | null;
  source: string;
  resolved: boolean;
  timestamp: string;
  joy_analysis: string | null;
  updated_at: string | null;
}

export interface ErrorsResponse {
  errors: RuntimeError[];
}
