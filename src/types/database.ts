export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          role: string;
          user_category: string;
          campus_id: string | null;
          is_active: boolean;
          password_changed: boolean;
          onboarding_completed: boolean;
          temp_password_hash: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: string;
          user_category?: string;
          campus_id?: string | null;
          is_active?: boolean;
          password_changed?: boolean;
          onboarding_completed?: boolean;
          temp_password_hash?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: string;
          user_category?: string;
          campus_id?: string | null;
          is_active?: boolean;
          password_changed?: boolean;
          onboarding_completed?: boolean;
          temp_password_hash?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          employee_id: string;
          department: string;
          designation: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          employee_id: string;
          department?: string;
          designation?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          department?: string;
          designation?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          admission_number: string;
          grade_level: string;
          class_id: string | null;
          enrollment_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          admission_number: string;
          grade_level: string;
          class_id?: string | null;
          enrollment_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          admission_number?: string;
          grade_level?: string;
          class_id?: string | null;
          enrollment_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      parent_students: {
        Row: {
          id: string;
          parent_id: string;
          student_id: string;
          relationship: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          student_id: string;
          relationship?: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string;
          student_id?: string;
          relationship?: string;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          key: string;
          name: string;
          category: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          category: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          category?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      permission_categories: {
        Row: {
          id: string;
          key: string;
          name: string;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      staff_permissions: {
        Row: {
          id: string;
          profile_id: string;
          permission_id: string;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          permission_id: string;
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          permission_id?: string;
          granted_by?: string | null;
          created_at?: string;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_token_hash: string;
          device_info: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          is_active: boolean;
          revoked_at: string | null;
          last_active_at: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_token_hash: string;
          device_info?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          is_active?: boolean;
          revoked_at?: string | null;
          last_active_at?: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_token_hash?: string;
          device_info?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          is_active?: boolean;
          revoked_at?: string | null;
          last_active_at?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      password_history: {
        Row: {
          id: string;
          user_id: string;
          password_hash: string;
          changed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          password_hash: string;
          changed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          password_hash?: string;
          changed_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json;
          impersonated_user_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Json;
          impersonated_user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          target_type?: string;
          target_id?: string | null;
          metadata?: Json;
          impersonated_user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      login_attempts: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          ip_address: string | null;
          user_agent: string | null;
          success: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          success?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          success?: boolean;
          created_at?: string;
        };
      };
      account_lockouts: {
        Row: {
          id: string;
          user_id: string;
          failed_attempts: number;
          locked_at: string | null;
          locked_until: string | null;
          unlocked_by: string | null;
          unlock_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          failed_attempts?: number;
          locked_at?: string | null;
          locked_until?: string | null;
          unlocked_by?: string | null;
          unlock_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          failed_attempts?: number;
          locked_at?: string | null;
          locked_until?: string | null;
          unlocked_by?: string | null;
          unlock_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      suggestions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          admin_response: string | null;
          responded_by: string | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          description: string;
          status?: string;
          priority?: string;
          admin_response?: string | null;
          responded_by?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          description?: string;
          status?: string;
          priority?: string;
          admin_response?: string | null;
          responded_by?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cms_pages: {
        Row: {
          id: string;
          slug: string;
          title: string;
          content: string;
          meta_description: string | null;
          published: boolean;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          content: string;
          meta_description?: string | null;
          published?: boolean;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          content?: string;
          meta_description?: string | null;
          published?: boolean;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string | null;
          event_type: string;
          target_audience: string;
          target_grade: string | null;
          campus_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date?: string | null;
          event_type: string;
          target_audience?: string;
          target_grade?: string | null;
          campus_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string | null;
          event_type?: string;
          target_audience?: string;
          target_grade?: string | null;
          campus_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      timetable_entries: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          room: string | null;
          topic: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          subject_id: string;
          teacher_id?: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          room?: string | null;
          topic?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          subject_id?: string;
          teacher_id?: string | null;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          room?: string | null;
          topic?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assessments: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          subject_id: string;
          strand: string;
          sub_strand: string;
          specific_learning_outcome: string | null;
          performance_level: string;
          score: number | null;
          max_score: number | null;
          term: string;
          academic_year: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          subject_id: string;
          strand: string;
          sub_strand: string;
          specific_learning_outcome?: string | null;
          performance_level: string;
          score?: number | null;
          max_score?: number | null;
          term: string;
          academic_year: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_id?: string;
          subject_id?: string;
          strand?: string;
          sub_strand?: string;
          specific_learning_outcome?: string | null;
          performance_level?: string;
          score?: number | null;
          max_score?: number | null;
          term?: string;
          academic_year?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          max_score: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          max_score?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          subject_id?: string;
          teacher_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          max_score?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      fee_payments: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          balance: number;
          term: string;
          academic_year: string;
          payment_date: string | null;
          payment_method: string | null;
          receipt_number: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          balance?: number;
          term: string;
          academic_year: string;
          payment_date?: string | null;
          payment_method?: string | null;
          receipt_number?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          amount?: number;
          balance?: number;
          term?: string;
          academic_year?: string;
          payment_date?: string | null;
          payment_method?: string | null;
          receipt_number?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      library_books: {
        Row: {
          id: string;
          title: string;
          author: string | null;
          isbn: string | null;
          category: string | null;
          status: string;
          campus_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          author?: string | null;
          isbn?: string | null;
          category?: string | null;
          status?: string;
          campus_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string | null;
          isbn?: string | null;
          category?: string | null;
          status?: string;
          campus_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      admissions: {
        Row: {
          id: string;
          student_name: string;
          parent_name: string | null;
          parent_email: string | null;
          parent_phone: string | null;
          grade_level: string;
          campus_id: string | null;
          status: string;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_name: string;
          parent_name?: string | null;
          parent_email?: string | null;
          parent_phone?: string | null;
          grade_level: string;
          campus_id?: string | null;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_name?: string;
          parent_name?: string | null;
          parent_email?: string | null;
          parent_phone?: string | null;
          grade_level?: string;
          campus_id?: string | null;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          subject: string | null;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          subject?: string | null;
          content: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          subject?: string | null;
          content?: string;
          read?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          created_at?: string;
        };
      };
      vora_content: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          subject: string;
          grade_level: string;
          category: string | null;
          topic: string | null;
          tags: string[] | null;
          channel: string | null;
          duration_seconds: number | null;
          thumbnail_url: string | null;
          youtube_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary?: string | null;
          subject?: string;
          grade_level?: string;
          category?: string | null;
          topic?: string | null;
          tags?: string[] | null;
          channel?: string | null;
          duration_seconds?: number | null;
          thumbnail_url?: string | null;
          youtube_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string | null;
          subject?: string;
          grade_level?: string;
          category?: string | null;
          topic?: string | null;
          tags?: string[] | null;
          channel?: string | null;
          duration_seconds?: number | null;
          thumbnail_url?: string | null;
          youtube_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_videos: {
        Row: {
          id: string;
          user_id: string;
          vora_content_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vora_content_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vora_content_id?: string;
          created_at?: string;
        };
      };
      campuses: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      grade_levels: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          name: string;
          grade_level_id: string | null;
          campus_id: string | null;
          class_teacher_id: string | null;
          capacity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          grade_level_id?: string | null;
          campus_id?: string | null;
          class_teacher_id?: string | null;
          capacity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          grade_level_id?: string | null;
          campus_id?: string | null;
          class_teacher_id?: string | null;
          capacity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      class_subjects: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          subject_id: string;
          teacher_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          subject_id?: string;
          teacher_id?: string | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversation_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      joy_user_preferences: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          personality_mode: string;
          language_preference: string;
          show_timestamps: boolean;
          enable_sound: boolean;
          enable_streaming: boolean;
          font_size: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: string;
          personality_mode?: string;
          language_preference?: string;
          show_timestamps?: boolean;
          enable_sound?: boolean;
          enable_streaming?: boolean;
          font_size?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: string;
          personality_mode?: string;
          language_preference?: string;
          show_timestamps?: boolean;
          enable_sound?: boolean;
          enable_streaming?: boolean;
          font_size?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      joy_analytics: {
        Row: {
          id: string;
          user_id: string | null;
          query: string;
          category: string | null;
          role: string | null;
          resolved: boolean;
          response_time_ms: number | null;
          model_used: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          query: string;
          category?: string | null;
          role?: string | null;
          resolved?: boolean;
          response_time_ms?: number | null;
          model_used?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          query?: string;
          category?: string | null;
          role?: string | null;
          resolved?: boolean;
          response_time_ms?: number | null;
          model_used?: string | null;
          created_at?: string;
        };
      };
      joy_action_logs: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          action_data: Json;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          action_data?: Json;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          action_data?: Json;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
      };
      homepage_carousel: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string | null;
          button_text: string | null;
          button_link: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          image_url?: string | null;
          button_text?: string | null;
          button_link?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          image_url?: string | null;
          button_text?: string | null;
          button_link?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      homepage_director_message: {
        Row: {
          id: string;
          director_name: string;
          title: string;
          message: string;
          image_url: string | null;
          is_active: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          director_name: string;
          title: string;
          message: string;
          image_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          director_name?: string;
          title?: string;
          message?: string;
          image_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
          created_at?: string;
        };
      };
      homepage_notices: {
        Row: {
          id: string;
          title: string;
          content: string;
          priority: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          priority?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          priority?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      homepage_stats: {
        Row: {
          id: string;
          label: string;
          value: string;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          value: string;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          value?: string;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      homepage_testimonials: {
        Row: {
          id: string;
          author_name: string;
          author_role: string | null;
          content: string;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_name: string;
          author_role?: string | null;
          content: string;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_name?: string;
          author_role?: string | null;
          content?: string;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      homepage_upcoming_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          event_date: string;
          location: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          event_date: string;
          location?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          event_date?: string;
          location?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_permissions: {
        Args: { p_user_id: string };
        Returns: { permission_key: string }[];
      };
      has_permission: {
        Args: { p_user_id: string; p_permission_key: string };
        Returns: boolean;
      };
      record_login_attempt: {
        Args: {
          p_user_id: string | null;
          p_email: string;
          p_success: boolean;
          p_ip_address: string | null;
          p_user_agent: string | null;
        };
        Returns: void;
      };
      get_lockout_details: {
        Args: { p_user_id: string };
        Returns: {
          is_locked: boolean;
          locked_until: string | null;
          failed_attempts: number;
          remaining_attempts: number;
        };
      };
      unlock_account: {
        Args: { p_user_id: string; p_admin_id: string; p_reason: string };
        Returns: void;
      };
      record_session: {
        Args: {
          p_user_id: string;
          p_token_hash: string;
          p_device_info: Json;
          p_ip_address: string | null;
          p_expires_at: string;
        };
        Returns: void;
      };
      force_logout_all_sessions: {
        Args: { p_user_id: string; p_admin_id: string; p_reason: string };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
