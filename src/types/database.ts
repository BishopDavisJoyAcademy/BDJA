export interface Database {
  public: {
    Tables: {
      profiles: { Row: any; Insert: any; Update: any };
      students: { Row: any; Insert: any; Update: any };
      classes: { Row: any; Insert: any; Update: any };
      subjects: { Row: any; Insert: any; Update: any };
      timetable: { Row: any; Insert: any; Update: any };
      calendar_events: { Row: any; Insert: any; Update: any };
      attendance: { Row: any; Insert: any; Update: any };
      assessments: { Row: any; Insert: any; Update: any };
      assignments: { Row: any; Insert: any; Update: any };
      assignment_submissions: { Row: any; Insert: any; Update: any };
      vora_content: { Row: any; Insert: any; Update: any };
      vora_quizzes: { Row: any; Insert: any; Update: any };
      vora_attempts: { Row: any; Insert: any; Update: any };
      library_resources: { Row: any; Insert: any; Update: any };
      library_borrowings: { Row: any; Insert: any; Update: any };
      fee_structures: { Row: any; Insert: any; Update: any };
      fee_payments: { Row: any; Insert: any; Update: any };
      admissions: { Row: any; Insert: any; Update: any };
      messages: { Row: any; Insert: any; Update: any };
      notifications: { Row: any; Insert: any; Update: any };
      character_reports: { Row: any; Insert: any; Update: any };
      values_badges: { Row: any; Insert: any; Update: any };
      study_streaks: { Row: any; Insert: any; Update: any };
      campuses: { Row: any; Insert: any; Update: any };
      parent_children: { Row: any; Insert: any; Update: any };
      class_subjects: { Row: any; Insert: any; Update: any };
      staff_roles: { Row: any; Insert: any; Update: any };
      audit_logs: { Row: any; Insert: any; Update: any };
    };
    Views: Record<string, any>;
    Functions: Record<string, any>;
  };
}
