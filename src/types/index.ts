export interface Campus {
  id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
}

export type UserRole = 'student' | 'parent' | 'teacher' | 'class_prefect' | 'bursar' | 'librarian' | 'principal' | 'super_admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  campus_id?: string;
  is_active: boolean;
  password_changed: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffRole {
  id: string;
  user_id: string;
  role: UserRole;
  campus_id?: string;
  permissions: Record<string, boolean>;
  assigned_by?: string;
}

export interface Class {
  id: string;
  campus_id: string;
  name: string;
  grade_level: GradeLevel;
  stream?: string;
  class_teacher_id?: string;
  academic_year: string;
}

export type GradeLevel = 'playgroup' | 'pp1' | 'pp2' | 'grade1' | 'grade2' | 'grade3' | 'grade4' | 'grade5' | 'grade6';

export interface Student {
  id: string;
  profile_id?: string;
  admission_number: string;
  class_id: string;
  campus_id: string;
  house_team?: string;
  barcode?: string;
  date_of_birth?: string;
  enrollment_date: string;
  status: 'active' | 'suspended' | 'transferred' | 'graduated';
}

export interface ParentChild {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  grade_levels: string[];
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
  campus_id: string;
  created_by?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  event_type: 'academic' | 'sports' | 'religious' | 'meeting' | 'holiday' | 'examination' | 'announcement';
  target_audience: 'all' | 'students' | 'parents' | 'staff' | 'specific_grade';
  target_grade?: string;
  campus_id?: string;
  created_by: string;
  attachments?: any[];
}

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  subject_id?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by: string;
  notes?: string;
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
  max_score: number;
  term: string;
  academic_year: string;
  assessed_by: string;
  change_reason?: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  attachments?: any[];
  due_date?: string;
  rubric?: any;
  status: 'draft' | 'published' | 'closed';
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  attachments?: any[];
  submitted_at: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  grade?: any;
  graded_by?: string;
  graded_at?: string;
}

export interface VoraContent {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  category?: string;
  topic?: string;
  youtube_url: string;
  summary?: string;
  tags?: string[];
  grade_level: string;
  duration_seconds?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  thumbnail_url?: string;
  channel?: string;
  source?: 'local' | 'youtube';
  visibility?: 'class' | 'campus' | 'cross_campus';
  approved?: boolean;
  uploaded_by?: string;
}

export interface LibraryResource {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  resource_type: 'pdf' | 'epub' | 'audio' | 'video' | 'image' | 'physical';
  file_url?: string;
  cover_url?: string;
  subject_id?: string;
  grade_levels?: string[];
  campus_id?: string;
  available_copies: number;
  total_copies: number;
}

export interface FeeStructure {
  id: string;
  campus_id: string;
  grade_level: string;
  term: string;
  academic_year: string;
  tuition: number;
  activity_fees: number;
  uniform: number;
  transport: number;
  other_fees?: any[];
  total: number;
}

export interface FeePayment {
  id: string;
  student_id: string;
  fee_structure_id: string;
  amount: number;
  payment_method: 'bank' | 'mpesa' | 'cash' | 'other';
  transaction_ref?: string;
  receipt_number?: string;
  status: 'pending' | 'verified' | 'rejected';
  verified_by?: string;
  verified_at?: string;
  receipt_url?: string;
}

export interface Admission {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  grade_applied: string;
  campus_id: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  documents?: any[];
  status: 'received' | 'review' | 'interview' | 'accepted' | 'enrolled' | 'rejected';
  admission_number?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  class_id?: string;
  subject?: string;
  content: string;
  attachments?: any[];
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  type: 'general' | 'academic' | 'fee' | 'attendance' | 'assignment' | 'calendar' | 'emergency';
  read: boolean;
  action_url?: string;
  created_at: string;
}

export interface CharacterReport {
  id: string;
  student_id: string;
  term: string;
  academic_year: string;
  integrity?: PerformanceLevel;
  discipline?: PerformanceLevel;
  respect?: PerformanceLevel;
  responsibility?: PerformanceLevel;
  teamwork?: PerformanceLevel;
  compassion?: PerformanceLevel;
  commitment?: PerformanceLevel;
  excellence?: PerformanceLevel;
  teacher_notes?: string;
}

export type PerformanceLevel = 'beginning' | 'developing' | 'competent' | 'exceeds';

export interface ValuesBadge {
  id: string;
  student_id: string;
  badge_type: string;
  awarded_by: string;
  reason?: string;
}

export interface StudyStreak {
  id: string;
  student_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
}

export interface JoyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: Record<string, any>;
}

export interface SavedVideo {
  id: string;
  user_id: string;
  video_id: string;
  title: string;
  subject?: string;
  grade_level?: string;
  youtube_url: string;
  summary?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  difficulty?: string;
  saved_at: string;
}


// Homepage Content Types
export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: boolean;
}

export interface DirectorMessage {
  id: string;
  director_name: string;
  director_title: string;
  message: string;
  director_photo_url: string | null;
  is_active: boolean;
}

export interface HomepageNotice {
  id: string;
  title: string;
  content: string;
  notice_date: string;
  icon_type: string;
  is_pinned: boolean;
  is_active: boolean;
}

export interface HomepageNews {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  news_date: string;
  category: string;
  is_featured: boolean;
  is_active: boolean;
}

export interface HomepageStat {
  id: string;
  label: string;
  value: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}

export interface HomepageGradeLevel {
  id: string;
  grade_key: string;
  display_name: string;
  icon_filename: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

export interface HomepageQuickLink {
  id: string;
  label: string;
  url: string;
  icon_name: string;
  target_audience: string;
  display_order: number;
  is_active: boolean;
}

// Teacher Tools Types
export interface TeacherTimetable {
  id: string;
  teacher_id: string;
  class_id: string | null;
  title: string;
  description: string | null;
  layout_config: {
    rows: string[];
    columns: string[];
    slots: Array<{
      rowIndex: number;
      colIndex: number;
      subject: string;
      room: string;
      notes: string;
    }>;
  };
  is_template: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TeacherRegister {
  id: string;
  teacher_id: string;
  class_id: string;
  title: string;
  register_date: string;
  layout_config: {
    columns: Array<{ key: string; label: string; type: string }>;
    students: Array<{ id: string; name: string; admission_number: string }>;
  };
  entries: Array<Record<string, any>>;
  is_template: boolean;
  template_name: string | null;
  created_at: string;
}

export interface TeacherMarkSheet {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string | null;
  title: string;
  term: string;
  academic_year: string;
  layout_config: {
    columns: Array<{ key: string; label: string; maxScore: number }>;
    students: Array<{ id: string; name: string; admission_number: string }>;
  };
  entries: Array<Record<string, any>>;
  max_score: number;
  is_template: boolean;
  template_name: string | null;
  created_at: string;
}

export interface MarkSheetTemplate {
  id: string;
  name: string;
  description: string | null;
  grade_levels: string[];
  layout_config: {
    columns: Array<{ key: string; label: string; maxScore: number }>;
  };
  created_by: string;
  is_active: boolean;
  created_at: string;
}
