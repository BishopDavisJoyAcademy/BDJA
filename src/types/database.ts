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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_lockouts: {
        Row: {
          created_at: string | null
          failed_attempts: number
          id: string
          ip_address: string | null
          last_failed_at: string | null
          locked_until: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          failed_attempts: number
          id?: string
          ip_address?: string | null
          last_failed_at?: string | null
          locked_until?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          failed_attempts?: number
          id?: string
          ip_address?: string | null
          last_failed_at?: string | null
          locked_until?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_recovery_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          reason: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          reason: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          reason?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admissions: {
        Row: {
          admission_number: string | null
          campus_id: string
          created_at: string | null
          date_of_birth: string | null
          documents: Json | null
          first_name: string
          gender: string | null
          grade_applied: string
          id: string
          last_name: string
          notes: string | null
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admission_number?: string | null
          campus_id: string
          created_at?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          first_name: string
          gender?: string | null
          grade_applied: string
          id?: string
          last_name: string
          notes?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admission_number?: string | null
          campus_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          first_name?: string
          gender?: string | null
          grade_applied?: string
          id?: string
          last_name?: string
          notes?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          reviewed_by?: string | null
          status?: string | null
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
          {
            foreignKeyName: "admissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          academic_year: string
          assessed_by: string
          change_reason: string | null
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
          assessed_by: string
          change_reason?: string | null
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
          assessed_by?: string
          change_reason?: string | null
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
            foreignKeyName: "assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attachments: Json | null
          content: string | null
          grade: Json | null
          graded_at: string | null
          graded_by: string | null
          id: string
          status: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          attachments?: Json | null
          content?: string | null
          grade?: Json | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          status?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          attachments?: Json | null
          content?: string | null
          grade?: Json | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          status?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachments: Json | null
          class_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          max_score: number | null
          rubric: Json | null
          status: string | null
          subject_id: string
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          class_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number | null
          rubric?: Json | null
          status?: string | null
          subject_id: string
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          class_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number | null
          rubric?: Json | null
          status?: string | null
          subject_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string | null
          date: string
          id: string
          marked_by: string
          notes: string | null
          status: string
          student_id: string
          subject_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          date: string
          id?: string
          marked_by: string
          notes?: string | null
          status: string
          student_id: string
          subject_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string
          notes?: string | null
          status?: string
          student_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
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
          attachments: Json | null
          campus_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          start_date: string
          target_audience: string
          target_grade: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          campus_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          start_date: string
          target_audience: string
          target_grade?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          campus_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          start_date?: string
          target_audience?: string
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
          location: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          location: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      character_reports: {
        Row: {
          academic_year: string
          assessed_by: string
          commitment: string | null
          compassion: string | null
          created_at: string | null
          discipline: string | null
          excellence: string | null
          id: string
          integrity: string | null
          respect: string | null
          responsibility: string | null
          student_id: string
          teacher_notes: string | null
          teamwork: string | null
          term: string
        }
        Insert: {
          academic_year: string
          assessed_by: string
          commitment?: string | null
          compassion?: string | null
          created_at?: string | null
          discipline?: string | null
          excellence?: string | null
          id?: string
          integrity?: string | null
          respect?: string | null
          responsibility?: string | null
          student_id: string
          teacher_notes?: string | null
          teamwork?: string | null
          term: string
        }
        Update: {
          academic_year?: string
          assessed_by?: string
          commitment?: string | null
          compassion?: string | null
          created_at?: string | null
          discipline?: string | null
          excellence?: string | null
          id?: string
          integrity?: string | null
          respect?: string | null
          responsibility?: string | null
          student_id?: string
          teacher_notes?: string | null
          teamwork?: string | null
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_reports_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string
          id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          id?: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
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
          academic_year: string
          campus_id: string
          class_teacher_id: string | null
          created_at: string | null
          grade_level: string
          id: string
          name: string
          stream: string | null
        }
        Insert: {
          academic_year: string
          campus_id: string
          class_teacher_id?: string | null
          created_at?: string | null
          grade_level: string
          id?: string
          name: string
          stream?: string | null
        }
        Update: {
          academic_year?: string
          campus_id?: string
          class_teacher_id?: string | null
          created_at?: string | null
          grade_level?: string
          id?: string
          name?: string
          stream?: string | null
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
        ]
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          last_edited_by: string | null
          meta_description: string | null
          meta_keywords: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          last_edited_by?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          last_edited_by?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_pages_last_edited_by_fkey"
            columns: ["last_edited_by"]
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
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string
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
          amount: number
          created_at: string | null
          fee_structure_id: string
          id: string
          notes: string | null
          payment_method: string
          receipt_number: string | null
          receipt_url: string | null
          status: string | null
          student_id: string
          transaction_ref: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          fee_structure_id: string
          id?: string
          notes?: string | null
          payment_method: string
          receipt_number?: string | null
          receipt_url?: string | null
          status?: string | null
          student_id: string
          transaction_ref?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          fee_structure_id?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_number?: string | null
          receipt_url?: string | null
          status?: string | null
          student_id?: string
          transaction_ref?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string
          activity_fees: number | null
          campus_id: string
          created_at: string | null
          created_by: string | null
          grade_level: string
          id: string
          other_fees: Json | null
          term: string
          total: number | null
          transport: number | null
          tuition: number
          uniform: number | null
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          activity_fees?: number | null
          campus_id: string
          created_at?: string | null
          created_by?: string | null
          grade_level: string
          id?: string
          other_fees?: Json | null
          term: string
          total?: number | null
          transport?: number | null
          tuition: number
          uniform?: number | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          activity_fees?: number | null
          campus_id?: string
          created_at?: string | null
          created_by?: string | null
          grade_level?: string
          id?: string
          other_fees?: Json | null
          term?: string
          total?: number | null
          transport?: number | null
          tuition?: number
          uniform?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          checksum: string | null
          created_at: string | null
          filename: string
          id: string
          mime_type: string
          original_name: string
          scan_result: string | null
          scanned: boolean | null
          size_bytes: number
          storage_path: string
          user_id: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          filename: string
          id?: string
          mime_type: string
          original_name: string
          scan_result?: string | null
          scanned?: boolean | null
          size_bytes: number
          storage_path: string
          user_id: string
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          filename?: string
          id?: string
          mime_type?: string
          original_name?: string
          scan_result?: string | null
          scanned?: boolean | null
          size_bytes?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_carousel: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_carousel_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_director_message: {
        Row: {
          created_at: string | null
          created_by: string | null
          director_name: string
          director_photo_url: string | null
          director_title: string
          id: string
          is_active: boolean | null
          message: string
          signature_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          director_name: string
          director_photo_url?: string | null
          director_title: string
          id?: string
          is_active?: boolean | null
          message: string
          signature_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          director_name?: string
          director_photo_url?: string | null
          director_title?: string
          id?: string
          is_active?: boolean | null
          message?: string
          signature_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_director_message_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_footer_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean | null
          label: string
          section: string
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          label: string
          section: string
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          label?: string
          section?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_footer_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_grade_levels: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          display_order: number
          grade_key: string
          icon_filename: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          display_order: number
          grade_key: string
          icon_filename: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          display_order?: number
          grade_key?: string
          icon_filename?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_grade_levels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_news: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          news_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          news_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          news_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_news_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_notices: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          icon_type: string | null
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          notice_date: string
          priority: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          icon_type?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          notice_date: string
          priority?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          icon_type?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          notice_date?: string
          priority?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_quick_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number
          icon_name: string | null
          id: string
          is_active: boolean | null
          label: string
          target_audience: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order: number
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          target_audience?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          target_audience?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_quick_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_social_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean | null
          platform: string
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          platform: string
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          platform?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_social_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_stats: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number
          icon_name: string
          id: string
          is_active: boolean | null
          label: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order: number
          icon_name: string
          id?: string
          is_active?: boolean | null
          label: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          icon_name?: string
          id?: string
          is_active?: boolean | null
          label?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_stats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          assigned_to: string | null
          barcode: string | null
          category: string
          condition: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          purchase_cost: number | null
          purchase_date: string | null
          quantity: number | null
          serial_number: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          barcode?: string | null
          category: string
          condition?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          purchase_cost?: number | null
          purchase_date?: string | null
          quantity?: number | null
          serial_number?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          barcode?: string | null
          category?: string
          condition?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          quantity?: number | null
          serial_number?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      joy_actions: {
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
            foreignKeyName: "joy_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      joy_analytics: {
        Row: {
          category: string
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
          category: string
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
          category?: string
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
          font_size: string
          id: string
          language_preference: string
          personality_mode: string
          show_timestamps: boolean | null
          theme: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enable_sound?: boolean | null
          enable_streaming?: boolean | null
          font_size: string
          id?: string
          language_preference: string
          personality_mode: string
          show_timestamps?: boolean | null
          theme: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enable_sound?: boolean | null
          enable_streaming?: boolean | null
          font_size?: string
          id?: string
          language_preference?: string
          personality_mode?: string
          show_timestamps?: boolean | null
          theme?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "joy_user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_borrowings: {
        Row: {
          borrowed_at: string | null
          due_date: string
          id: string
          resource_id: string
          returned_at: string | null
          staff_id: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          borrowed_at?: string | null
          due_date: string
          id?: string
          resource_id: string
          returned_at?: string | null
          staff_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          borrowed_at?: string | null
          due_date?: string
          id?: string
          resource_id?: string
          returned_at?: string | null
          staff_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_borrowings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "library_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_borrowings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_borrowings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resources: {
        Row: {
          author: string | null
          available_copies: number | null
          borrowed_by: Json | null
          campus_id: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          file_url: string | null
          grade_levels: string[] | null
          id: string
          isbn: string | null
          resource_type: string
          subject_id: string | null
          title: string
          total_copies: number | null
        }
        Insert: {
          author?: string | null
          available_copies?: number | null
          borrowed_by?: Json | null
          campus_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          grade_levels?: string[] | null
          id?: string
          isbn?: string | null
          resource_type: string
          subject_id?: string | null
          title: string
          total_copies?: number | null
        }
        Update: {
          author?: string | null
          available_copies?: number | null
          borrowed_by?: Json | null
          campus_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          grade_levels?: string[] | null
          id?: string
          isbn?: string | null
          resource_type?: string
          subject_id?: string | null
          title?: string
          total_copies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_resources_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: unknown
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Relationships: []
      }
      login_audit: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          email: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          email?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          email?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mark_sheet_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          grade_levels: string[] | null
          id: string
          is_active: boolean | null
          layout_config: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          grade_levels?: string[] | null
          id?: string
          is_active?: boolean | null
          layout_config: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          grade_levels?: string[] | null
          id?: string
          is_active?: boolean | null
          layout_config?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mark_sheet_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          class_id: string | null
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          read_at: string | null
          receiver_id: string | null
          sender_id: string
          subject: string | null
        }
        Insert: {
          attachments?: Json | null
          class_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id: string
          subject?: string | null
        }
        Update: {
          attachments?: Json | null
          class_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
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
          action_url: string | null
          content: string | null
          created_at: string | null
          id: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
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
      parent_children: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_children_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "permissions_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "permission_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      platform_settings: {
        Row: {
          academic_year: string | null
          accent_color: string | null
          address: string | null
          auto_backup: boolean | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          email_notifications: boolean | null
          favicon_url: string | null
          grading_system: string | null
          id: string
          logo_url: string | null
          maintenance_mode: boolean | null
          max_class_size: number | null
          primary_color: string | null
          registration_open: boolean | null
          school_code: string | null
          school_name: string | null
          sms_notifications: boolean | null
          term: string | null
          term_end_date: string | null
          term_start_date: string | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          accent_color?: string | null
          address?: string | null
          auto_backup?: boolean | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email_notifications?: boolean | null
          favicon_url?: string | null
          grading_system?: string | null
          id?: string
          logo_url?: string | null
          maintenance_mode?: boolean | null
          max_class_size?: number | null
          primary_color?: string | null
          registration_open?: boolean | null
          school_code?: string | null
          school_name?: string | null
          sms_notifications?: boolean | null
          term?: string | null
          term_end_date?: string | null
          term_start_date?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          accent_color?: string | null
          address?: string | null
          auto_backup?: boolean | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email_notifications?: boolean | null
          favicon_url?: string | null
          grading_system?: string | null
          id?: string
          logo_url?: string | null
          maintenance_mode?: boolean | null
          max_class_size?: number | null
          primary_color?: string | null
          registration_open?: boolean | null
          school_code?: string | null
          school_name?: string | null
          sms_notifications?: boolean | null
          term?: string | null
          term_end_date?: string | null
          term_start_date?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
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
          failed_login_count: number | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          last_login_ip: unknown
          last_password_change: string | null
          locked_until: string | null
          mfa_enabled: boolean | null
          mfa_secret: string | null
          onboarding_completed: boolean
          password_changed: boolean
          phone: string | null
          role: string
          temp_password_hash: string | null
          updated_at: string | null
          user_category: string
        }
        Insert: {
          avatar_url?: string | null
          campus_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          failed_login_count?: number | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at?: string | null
          last_login_ip?: unknown
          last_password_change?: string | null
          locked_until?: string | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          onboarding_completed: boolean
          password_changed: boolean
          phone?: string | null
          role: string
          temp_password_hash?: string | null
          updated_at?: string | null
          user_category: string
        }
        Update: {
          avatar_url?: string | null
          campus_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          failed_login_count?: number | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_login_ip?: unknown
          last_password_change?: string | null
          locked_until?: string | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          onboarding_completed?: boolean
          password_changed?: boolean
          phone?: string | null
          role?: string
          temp_password_hash?: string | null
          updated_at?: string | null
          user_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_errors: {
        Row: {
          component: string | null
          id: string
          joy_analysis: string | null
          message: string
          resolved: boolean
          source: string
          stack: string | null
          timestamp: string
          updated_at: string | null
          url: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          id?: string
          joy_analysis?: string | null
          message: string
          resolved?: boolean
          source?: string
          stack?: string | null
          timestamp?: string
          updated_at?: string | null
          url?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          id?: string
          joy_analysis?: string | null
          message?: string
          resolved?: boolean
          source?: string
          stack?: string | null
          timestamp?: string
          updated_at?: string | null
          url?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      saved_videos: {
        Row: {
          difficulty: string | null
          duration_seconds: number | null
          grade_level: string | null
          id: string
          saved_at: string | null
          subject: string | null
          summary: string | null
          thumbnail_url: string | null
          title: string
          user_id: string
          video_id: string
          youtube_url: string
        }
        Insert: {
          difficulty?: string | null
          duration_seconds?: number | null
          grade_level?: string | null
          id?: string
          saved_at?: string | null
          subject?: string | null
          summary?: string | null
          thumbnail_url?: string | null
          title: string
          user_id: string
          video_id: string
          youtube_url: string
        }
        Update: {
          difficulty?: string | null
          duration_seconds?: number | null
          grade_level?: string | null
          id?: string
          saved_at?: string | null
          subject?: string | null
          summary?: string | null
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          video_id?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string | null
          department: string | null
          designation: string | null
          employee_id: string | null
          id: string
          join_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          id?: string
          join_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          id?: string
          join_date?: string | null
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
      staff_roles: {
        Row: {
          assigned_by: string | null
          campus_id: string | null
          created_at: string | null
          id: string
          permissions: Json
          role: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          campus_id?: string | null
          created_at?: string | null
          id?: string
          permissions: Json
          role: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          campus_id?: string | null
          created_at?: string | null
          id?: string
          permissions?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_number: string
          barcode: string | null
          campus_id: string | null
          class_id: string | null
          created_at: string | null
          date_of_birth: string | null
          enrollment_date: string | null
          grade_level: string | null
          house_team: string | null
          id: string
          profile_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admission_number: string
          barcode?: string | null
          campus_id?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          enrollment_date?: string | null
          grade_level?: string | null
          house_team?: string | null
          id?: string
          profile_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admission_number?: string
          barcode?: string | null
          campus_id?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          enrollment_date?: string | null
          grade_level?: string | null
          house_team?: string | null
          id?: string
          profile_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_streaks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          grade_levels: string[] | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          grade_levels?: string[] | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          grade_levels?: string[] | null
          id?: string
          name?: string
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
          status: string
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
          status: string
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
          status?: string
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
      teacher_mark_sheets: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string | null
          created_by: string | null
          entries: Json
          id: string
          is_template: boolean | null
          layout_config: Json
          max_score: number | null
          subject_id: string | null
          teacher_id: string
          template_name: string | null
          term: string
          title: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string | null
          created_by?: string | null
          entries: Json
          id?: string
          is_template?: boolean | null
          layout_config: Json
          max_score?: number | null
          subject_id?: string | null
          teacher_id: string
          template_name?: string | null
          term: string
          title: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          entries?: Json
          id?: string
          is_template?: boolean | null
          layout_config?: Json
          max_score?: number | null
          subject_id?: string | null
          teacher_id?: string
          template_name?: string | null
          term?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_mark_sheets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_mark_sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_mark_sheets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_mark_sheets_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_registers: {
        Row: {
          class_id: string
          created_at: string | null
          created_by: string | null
          entries: Json
          id: string
          is_template: boolean | null
          layout_config: Json
          register_date: string
          teacher_id: string
          template_name: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          created_by?: string | null
          entries: Json
          id?: string
          is_template?: boolean | null
          layout_config: Json
          register_date: string
          teacher_id: string
          template_name?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          entries?: Json
          id?: string
          is_template?: boolean | null
          layout_config?: Json
          register_date?: string
          teacher_id?: string
          template_name?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_registers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_registers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_registers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_timetables: {
        Row: {
          class_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          layout_config: Json
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          layout_config: Json
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          layout_config?: Json
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_timetables_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          campus_id: string
          class_id: string
          created_at: string | null
          created_by: string | null
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
          campus_id: string
          class_id: string
          created_at?: string | null
          created_by?: string | null
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
          campus_id?: string
          class_id?: string
          created_at?: string | null
          created_by?: string | null
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
            foreignKeyName: "timetable_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_teacher_id_fkey"
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
          device_fingerprint: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_active_at: string | null
          revoked_at: string | null
          revoked_reason: string | null
          session_token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_active_at?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_active_at?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      values_badges: {
        Row: {
          awarded_by: string
          badge_type: string
          created_at: string | null
          id: string
          reason: string | null
          student_id: string
        }
        Insert: {
          awarded_by: string
          badge_type: string
          created_at?: string | null
          id?: string
          reason?: string | null
          student_id: string
        }
        Update: {
          awarded_by?: string
          badge_type?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "values_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "values_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      vora_attempts: {
        Row: {
          answers: Json | null
          completed: boolean | null
          created_at: string | null
          id: string
          score: number | null
          student_id: string
          vora_id: string
        }
        Insert: {
          answers?: Json | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          score?: number | null
          student_id: string
          vora_id: string
        }
        Update: {
          answers?: Json | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          score?: number | null
          student_id?: string
          vora_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vora_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vora_attempts_vora_id_fkey"
            columns: ["vora_id"]
            isOneToOne: false
            referencedRelation: "vora_content"
            referencedColumns: ["id"]
          },
        ]
      }
      vora_content: {
        Row: {
          approved: boolean | null
          approved_by: string | null
          campus_id: string
          captions: Json | null
          class_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration: string | null
          grade_level: string
          id: string
          is_public: boolean | null
          specific_learning_outcome: string | null
          strand: string | null
          sub_strand: string | null
          subject: string
          subject_id: string | null
          summary: string | null
          thumbnail_url: string | null
          title: string
          topic: string | null
          transcript: string | null
          updated_at: string | null
          uploaded_by: string
          video_url: string
          visibility: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_by?: string | null
          campus_id: string
          captions?: Json | null
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          grade_level: string
          id?: string
          is_public?: boolean | null
          specific_learning_outcome?: string | null
          strand?: string | null
          sub_strand?: string | null
          subject: string
          subject_id?: string | null
          summary?: string | null
          thumbnail_url?: string | null
          title: string
          topic?: string | null
          transcript?: string | null
          updated_at?: string | null
          uploaded_by: string
          video_url: string
          visibility?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_by?: string | null
          campus_id?: string
          captions?: Json | null
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          grade_level?: string
          id?: string
          is_public?: boolean | null
          specific_learning_outcome?: string | null
          strand?: string | null
          sub_strand?: string | null
          subject?: string
          subject_id?: string | null
          summary?: string | null
          thumbnail_url?: string | null
          title?: string
          topic?: string | null
          transcript?: string | null
          updated_at?: string | null
          uploaded_by?: string
          video_url?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vora_content_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vora_content_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vora_content_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vora_content_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vora_content_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vora_quizzes: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          explanation: string | null
          id: string
          options: Json | null
          order_index: number | null
          question: string
          vora_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          question: string
          vora_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          question?: string
          vora_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vora_quizzes_vora_id_fkey"
            columns: ["vora_id"]
            isOneToOne: false
            referencedRelation: "vora_content"
            referencedColumns: ["id"]
          },
        ]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
