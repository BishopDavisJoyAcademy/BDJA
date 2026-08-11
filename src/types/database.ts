export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_lockouts: {
        Row: {
          created_at: string | null
          failed_attempts: number | null
          id: string
          locked_at: string | null
          locked_until: string | null
          unlock_reason: string | null
          unlocked_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          locked_at?: string | null
          locked_until?: string | null
          unlock_reason?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          locked_at?: string | null
          locked_until?: string | null
          unlock_reason?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_lockouts_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_lockouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admissions: {
        Row: {
          campus_id: string | null
          grade_level: string
          id: string
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          status: string | null
          student_name: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          campus_id?: string | null
          grade_level: string
          id?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          status?: string | null
          student_name: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          campus_id?: string | null
          grade_level?: string
          id?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          status?: string | null
          student_name?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissions_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string | null
          id: string
          max_score: number | null
          performance_level: string
          score: number | null
          specific_learning_outcome: string | null
          strand: string
          student_id: string
          sub_strand: string
          subject_id: string
          term: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string | null
          id?: string
          max_score?: number | null
          performance_level: string
          score?: number | null
          specific_learning_outcome?: string | null
          strand: string
          student_id: string
          sub_strand: string
          subject_id: string
          term: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string | null
          id?: string
          max_score?: number | null
          performance_level?: string
          score?: number | null
          specific_learning_outcome?: string | null
          strand?: string
          student_id?: string
          sub_strand?: string
          subject_id?: string
          term?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          class_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          max_score: number | null
          status: string | null
          subject_id: string
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number | null
          status?: string | null
          subject_id: string
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number | null
          status?: string | null
          subject_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          impersonated_user_id: string | null
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_impersonated_user_id_fkey"
            columns: ["impersonated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          campus_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          start_date: string
          target_audience: string | null
          target_grade: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          campus_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          start_date: string
          target_audience?: string | null
          target_grade?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          campus_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          start_date?: string
          target_audience?: string | null
          target_grade?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          campus_id: string | null
          capacity: number | null
          class_teacher_id: string | null
          created_at: string | null
          grade_level_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          campus_id?: string | null
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string | null
          grade_level_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          campus_id?: string | null
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string | null
          grade_level_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_grade_level_id_fkey"
            columns: ["grade_level_id"]
            isOneToOne: false
            referencedRelation: "grade_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          meta_description: string | null
          published: boolean | null
          slug: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          meta_description?: string | null
          published?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          meta_description?: string | null
          published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_pinned: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          academic_year: string
          amount: number
          balance: number | null
          created_at: string | null
          id: string
          payment_date: string | null
          payment_method: string | null
          receipt_number: string | null
          status: string | null
          student_id: string
          term: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          amount: number
          balance?: number | null
          created_at?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          status?: string | null
          student_id: string
          term: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          amount?: number
          balance?: number | null
          created_at?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          status?: string | null
          student_id?: string
          term?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_levels: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      homepage_carousel: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_director_message: {
        Row: {
          created_at: string | null
          director_name: string
          id: string
          image_url: string | null
          is_active: boolean | null
          message: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          director_name: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          message: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          director_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          message?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_notices: {
        Row: {
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_stats: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      homepage_testimonials: {
        Row: {
          author_name: string
          author_role: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          author_name: string
          author_role?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          author_name?: string
          author_role?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_upcoming_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          image_url: string | null
          is_active: boolean | null
          location: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      joy_action_logs: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string | null
          error_message: string | null
          id: string
          success: boolean | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          success?: boolean | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          success?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "joy_action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      joy_analytics: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          model_used: string | null
          query: string
          resolved: boolean | null
          response_time_ms: number | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          model_used?: string | null
          query: string
          resolved?: boolean | null
          response_time_ms?: number | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          model_used?: string | null
          query?: string
          resolved?: boolean | null
          response_time_ms?: number | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "joy_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      joy_user_preferences: {
        Row: {
          created_at: string | null
          enable_sound: boolean | null
          enable_streaming: boolean | null
          font_size: string | null
          id: string
          language_preference: string | null
          personality_mode: string | null
          show_timestamps: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enable_sound?: boolean | null
          enable_streaming?: boolean | null
          font_size?: string | null
          id?: string
          language_preference?: string | null
          personality_mode?: string | null
          show_timestamps?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enable_sound?: boolean | null
          enable_streaming?: boolean | null
          font_size?: string | null
          id?: string
          language_preference?: string | null
          personality_mode?: string | null
          show_timestamps?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "joy_user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          author: string | null
          campus_id: string | null
          category: string | null
          created_at: string | null
          id: string
          isbn: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          campus_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          isbn?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          campus_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          isbn?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_books_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          ip_address: unknown
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          recipient_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_history: {
        Row: {
          changed_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          changed_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          key: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          key: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          key?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          campus_id: string | null
          created_at: string | null
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          onboarding_completed: boolean | null
          password_changed: boolean | null
          phone: string | null
          role: string | null
          temp_password_hash: string | null
          updated_at: string | null
          user_category: string | null
        }
        Insert: {
          avatar_url?: string | null
          campus_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          onboarding_completed?: boolean | null
          password_changed?: boolean | null
          phone?: string | null
          role?: string | null
          temp_password_hash?: string | null
          updated_at?: string | null
          user_category?: string | null
        }
        Update: {
          avatar_url?: string | null
          campus_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          onboarding_completed?: boolean | null
          password_changed?: boolean | null
          phone?: string | null
          role?: string | null
          temp_password_hash?: string | null
          updated_at?: string | null
          user_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_videos: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          vora_content_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          vora_content_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          vora_content_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_videos_vora_content_id_fkey"
            columns: ["vora_content_id"]
            isOneToOne: false
            referencedRelation: "vora_content"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string | null
          department: string | null
          designation: string | null
          employee_id: string
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          designation?: string | null
          employee_id: string
          id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          designation?: string | null
          employee_id?: string
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_number: string
          class_id: string | null
          created_at: string | null
          enrollment_date: string | null
          grade_level: string
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admission_number: string
          class_id?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          grade_level: string
          id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admission_number?: string
          class_id?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          grade_level?: string
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          admin_response: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          responded_at: string | null
          responded_by: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          class_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
          subject_id: string
          teacher_id: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          subject_id: string
          teacher_id?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          subject_id?: string
          teacher_id?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_active_at: string | null
          revoked_at: string | null
          session_token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_active_at?: string | null
          revoked_at?: string | null
          session_token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_active_at?: string | null
          revoked_at?: string | null
          session_token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vora_content: {
        Row: {
          category: string | null
          channel: string | null
          created_at: string | null
          duration_seconds: number | null
          grade_level: string
          id: string
          is_public: boolean | null
          subject: string
          summary: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          topic: string | null
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          category?: string | null
          channel?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          grade_level?: string
          id?: string
          is_public?: boolean | null
          subject?: string
          summary?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          topic?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          category?: string | null
          channel?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          grade_level?: string
          id?: string
          is_public?: boolean | null
          subject?: string
          summary?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          topic?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      force_logout_all_sessions: {
        Args: { p_admin_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      get_lockout_details: {
        Args: { p_user_id: string }
        Returns: {
          failed_attempts: number
          is_locked: boolean
          locked_until: string
          remaining_attempts: number
        }[]
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          permission_key: string
        }[]
      }
      has_permission: {
        Args: { p_permission_key: string; p_user_id: string }
        Returns: boolean
      }
      record_login_attempt: {
        Args: {
          p_email: string
          p_ip_address: unknown
          p_success: boolean
          p_user_agent: string
          p_user_id: string
        }
        Returns: undefined
      }
      record_session: {
        Args: {
          p_device_info: Json
          p_expires_at: string
          p_ip_address: unknown
          p_token_hash: string
          p_user_id: string
        }
        Returns: undefined
      }
      unlock_account: {
        Args: { p_admin_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
