export type UserCategory = "student" | "parent" | "staff" | "admin";
export type UserRole = "student" | "parent" | "staff" | "admin";

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
  employee_id: string;
  department: string;
  designation: string;
  status: "active" | "inactive" | "on_leave" | "terminated";
  created_at?: string;
  updated_at?: string;
}

export interface StudentRecord {
  id: string;
  admission_number: string;
  grade_level: string;
  class_id?: string | null;
  enrollment_date?: string;
  status: "active" | "inactive" | "graduated" | "transferred";
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
  description?: string;
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
  metadata?: Record<string, any>;
  impersonated_user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ValidatedSession {
  userId: string;
  email: string;
  role: UserRole;
  userCategory: UserCategory;
  fullName: string;
  campusId: string | null;
  passwordChanged: boolean;
  onboardingCompleted: boolean;
  isActive: boolean;
  permissions: string[];
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
  admin_response?: string;
  responded_by?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
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
  created_by: string;
}

export interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  topic?: string;
}

export interface Assessment {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  strand: string;
  sub_strand: string;
  specific_learning_outcome?: string;
  performance_level: "beginning" | "developing" | "competent" | "exceeds";
  score?: number;
  max_score?: number;
  term: string;
  academic_year: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  due_date?: string;
  max_score?: number;
  status: "draft" | "published" | "closed";
}

export interface FeePayment {
  id: string;
  student_id: string;
  amount: number;
  balance: number;
  term: string;
  academic_year: string;
  payment_date?: string;
  payment_method?: string;
  receipt_number?: string;
  status: "paid" | "partial" | "unpaid" | "overdue";
}

export interface LibraryBook {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
  status: "available" | "borrowed" | "lost" | "damaged";
  campus_id?: string;
}

export interface Admission {
  id: string;
  student_name: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  grade_level: string;
  campus_id?: string;
  status: "pending" | "reviewing" | "approved" | "rejected" | "waitlisted";
  submitted_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface VoraContent {
  id: string;
  title: string;
  summary?: string;
  subject?: string;
  grade_level?: string;
  category?: string;
  topic?: string;
  tags?: string[];
  channel?: string;
  duration_seconds?: number;
  thumbnail_url?: string;
  video_url?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface JoyMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
