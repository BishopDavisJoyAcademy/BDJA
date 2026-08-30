export type UserCategory = "student" | "parent" | "staff" | "admin";
export type UserRole = "student" | "parent" | "staff" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  role: string;
  user_category: string | null;
  campus_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  must_change_password: boolean;
  permissions?: string[];
  // Related data (populated when needed)
  department?: string | null;
  designation?: string | null;
  grade_level?: string | null;
  admission_number?: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  user_category: UserCategory;
  campus_id?: string | null;
  is_active: boolean;
  password_changed: boolean;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  temp_password_hash?: string | null;
}

export interface StaffRecord {
  id: string;
  employee_id: string | null;
  department: string | null;
  designation: string | null;
  status: string | null;
  join_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StudentRecord {
  id: string;
  admission_number: string;
  grade_level: string | null;
  class_id?: string | null;
  enrollment_date?: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface PermissionCategory {
  id: string;
  key: string;
  name: string;
  icon?: string;
  sort_order: number;
}

export interface Campus {
  id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
  impersonated_user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ValidatedSession {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  campusId: string | null;
  userCategory: string | null;
  passwordChanged: boolean;
  onboardingCompleted: boolean;
  isActive: boolean;
  fullName: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: string;
  retryAfter?: number;
}

export interface Suggestion {
  id: string;
  user_id: string;
  type: "idea" | "feedback" | "bug" | "improvement" | "complaint";
  title: string;
  description: string;
  status: "open" | "under_review" | "planned" | "implemented" | "declined" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  admin_response?: string | null;
  responded_by?: string | null;
  responded_at?: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description?: string | null;
  is_published: boolean | null;
  last_edited_by?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  meta_keywords?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  event_type: string;
  target_audience: string;
  target_grade?: string;
  campus_id?: string;
  created_by?: string;
  created_at?: string;
}

export interface LibraryResource {
  id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  resource_type: string;
  subject_id?: string | null;
  grade_levels?: string[] | null;
  total_copies?: number | null;
  available_copies?: number | null;
  cover_url?: string | null;
  file_url?: string | null;
  campus_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  borrowed_by?: unknown;
}

export interface VoraContent {
  id: string;
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  subject: string;
  subject_id?: string | null;
  grade_level: string;
  class_id?: string | null;
  campus_id: string;
  uploaded_by: string;
  created_by?: string | null;
  approved?: boolean | null;
  approved_by?: string | null;
  is_public?: boolean | null;
  visibility?: string | null;
  duration?: string | null;
  transcript?: string | null;
  captions?: unknown;
  summary?: string | null;
  topic?: string | null;
  strand?: string | null;
  sub_strand?: string | null;
  specific_learning_outcome?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ThemeConfig {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  fontFamily: string;
  borderRadius: string;
  spacing: string;
  isDefault: boolean;
  isDark: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
  link?: string | null;
}

// Re-export from joy types for convenience
export type { JoyMessage } from "./joy";
