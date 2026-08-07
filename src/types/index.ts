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
export type UserRole = 'student' | 'parent' | 'staff' | 'admin';

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
  status: 'active' | 'inactive' | 'suspended';
}

export interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  relationship?: string;
  is_primary?: boolean;
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

export interface Suggestion {
  id: string;
  user_id: string;
  type: 'idea' | 'feedback' | 'bug' | 'improvement' | 'complaint';
  title: string;
  description: string;
  status: 'open' | 'under_review' | 'planned' | 'implemented' | 'declined' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
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
  meta_description?: string;
  published: boolean;
  updated_by?: string;
  updated_at?: string;
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
  performance_level: 'beginning' | 'developing' | 'competent' | 'exceeds';
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
  status: 'draft' | 'published' | 'closed';
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
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
}

export interface LibraryBook {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
  status: 'available' | 'borrowed' | 'lost' | 'damaged';
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
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'waitlisted';
  submitted_at: string;
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

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  content: string;
  read: boolean;
  created_at: string;
}
