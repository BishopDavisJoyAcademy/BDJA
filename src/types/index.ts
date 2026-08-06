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
  youtube_url?: string;
}

export interface JoyMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface Campus {
  id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
}

export type UserCategory = 'student' | 'parent' | 'staff' | 'admin';

// Legacy role kept for backward compatibility during transition
export type UserRole = 'student' | 'parent' | 'teacher' | 'class_prefect' | 'bursar' | 'librarian' | 'principal' | 'super_admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  user_category: UserCategory;
  campus_id?: string;
  is_active: boolean;
  password_changed: boolean;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  admission_number?: string;
  grade_level?: string;
  class_id?: string;
  enrollment_date?: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
}

export interface Staff {
  id: string;
  employee_id?: string;
  department?: string;
  designation?: string;
  join_date?: string;
  status: 'active' | 'inactive' | 'on_leave';
}

export interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  is_primary: boolean;
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

export interface StaffPermission {
  id: string;
  profile_id: string;
  permission_id: string;
  granted_by?: string;
  created_at?: string;
  permission?: Permission;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description?: string;
  is_published: boolean;
  updated_at?: string;
}

export interface Admission {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email?: string;
  grade_level: string;
  campus_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'enrolled';
  notes?: string;
  created_at?: string;
}

export interface FeeStructure {
  id: string;
  grade_level: string;
  term: string;
  academic_year: string;
  amount: number;
  description?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  fee_structure_id: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'verified' | 'rejected';
  receipt_number?: string;
  paid_at?: string;
  verified_by?: string;
  created_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  all_day: boolean;
  audience: string[];
  grade_levels?: string[];
  campus_id?: string;
  created_by: string;
  created_at?: string;
}

export interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  grade_levels: string[];
  description?: string;
}

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  term: string;
  academic_year: string;
  score: number;
  max_score: number;
  grade_level: string;
  remarks?: string;
  teacher_id: string;
  created_at?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  due_date: string;
  max_score: number;
  status: 'draft' | 'published' | 'closed';
  created_at?: string;
}

export interface VoraVideo {
  id: string;
  title: string;
  description?: string;
  youtube_id: string;
  grade_level?: string;
  subject_id?: string;
  topic?: string;
  duration?: number;
  is_featured: boolean;
  created_by: string;
  created_at?: string;
}

export interface LibraryResource {
  id: string;
  title: string;
  author?: string;
  resource_type: string;
  grade_level?: string;
  subject_id?: string;
  file_url?: string;
  file_type?: string;
  is_physical: boolean;
  quantity?: number;
  available?: number;
  created_by: string;
  created_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  content: string;
  is_read: boolean;
  parent_message_id?: string;
  created_at?: string;
}
