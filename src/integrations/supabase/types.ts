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
      accounting_connections: {
        Row: {
          access_token: string | null
          account_name: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          owner_id: string
          provider: Database["public"]["Enums"]["accounting_provider"]
          realm_id: string | null
          refresh_token: string | null
          status: string
          tenant_id: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          owner_id: string
          provider: Database["public"]["Enums"]["accounting_provider"]
          realm_id?: string | null
          refresh_token?: string | null
          status?: string
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          owner_id?: string
          provider?: Database["public"]["Enums"]["accounting_provider"]
          realm_id?: string | null
          refresh_token?: string | null
          status?: string
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      athlete_device_connections: {
        Row: {
          access_token: string | null
          athlete_id: string
          created_at: string
          daily_strain: number | null
          hrv: number | null
          id: string
          last_synced_at: string | null
          provider: Database["public"]["Enums"]["device_provider"]
          recovery_score: number | null
          refresh_token: string | null
          resting_hr: number | null
          sleep_score: number | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          athlete_id: string
          created_at?: string
          daily_strain?: number | null
          hrv?: number | null
          id?: string
          last_synced_at?: string | null
          provider: Database["public"]["Enums"]["device_provider"]
          recovery_score?: number | null
          refresh_token?: string | null
          resting_hr?: number | null
          sleep_score?: number | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          athlete_id?: string
          created_at?: string
          daily_strain?: number | null
          hrv?: number | null
          id?: string
          last_synced_at?: string | null
          provider?: Database["public"]["Enums"]["device_provider"]
          recovery_score?: number | null
          refresh_token?: string | null
          resting_hr?: number | null
          sleep_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_device_connections_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_health_profiles: {
        Row: {
          allergies: Json
          athlete_id: string
          clearance_doc_url: string | null
          conditions: string | null
          created_at: string
          emergency_contacts: Json
          id: string
          insurance_info: Json | null
          medications: string | null
          needs_encryption: boolean
          physician_name: string | null
          physician_phone: string | null
          updated_at: string
        }
        Insert: {
          allergies?: Json
          athlete_id: string
          clearance_doc_url?: string | null
          conditions?: string | null
          created_at?: string
          emergency_contacts?: Json
          id?: string
          insurance_info?: Json | null
          medications?: string | null
          needs_encryption?: boolean
          physician_name?: string | null
          physician_phone?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: Json
          athlete_id?: string
          clearance_doc_url?: string | null
          conditions?: string | null
          created_at?: string
          emergency_contacts?: Json
          id?: string
          insurance_info?: Json | null
          medications?: string | null
          needs_encryption?: boolean
          physician_name?: string | null
          physician_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_health_profiles_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_media: {
        Row: {
          annotation_status: Database["public"]["Enums"]["media_annotation_status"]
          athlete_id: string | null
          caption: string | null
          coach_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          is_shared: boolean
          recorded_at: string
          session_id: string | null
          thumbnail_url: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          annotation_status?: Database["public"]["Enums"]["media_annotation_status"]
          athlete_id?: string | null
          caption?: string | null
          coach_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_shared?: boolean
          recorded_at?: string
          session_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          annotation_status?: Database["public"]["Enums"]["media_annotation_status"]
          athlete_id?: string | null
          caption?: string | null
          coach_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_shared?: boolean
          recorded_at?: string
          session_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_media_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_media_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "camp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_note_videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          note_id: string
          thumbnail_url: string | null
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          note_id: string
          thumbnail_url?: string | null
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          note_id?: string
          thumbnail_url?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_note_videos_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "athlete_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_notes: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          drill_freetext: Json
          drill_ids: Json
          id: string
          is_shared: boolean
          note_date: string
          session_rating: number | null
          updated_at: string
          written_notes: string | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string
          drill_freetext?: Json
          drill_ids?: Json
          id?: string
          is_shared?: boolean
          note_date?: string
          session_rating?: number | null
          updated_at?: string
          written_notes?: string | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          drill_freetext?: Json
          drill_ids?: Json
          id?: string
          is_shared?: boolean
          note_date?: string
          session_rating?: number | null
          updated_at?: string
          written_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_program_enrollments: {
        Row: {
          athlete_id: string
          created_at: string
          enrolled_by: string
          enrolled_by_role: Database["public"]["Enums"]["enrollment_role"]
          id: string
          program_id: string
          start_date: string
          status: Database["public"]["Enums"]["enrollment_status"]
          training_days: Json
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          enrolled_by: string
          enrolled_by_role: Database["public"]["Enums"]["enrollment_role"]
          id?: string
          program_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          training_days?: Json
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          enrolled_by?: string
          enrolled_by_role?: Database["public"]["Enums"]["enrollment_role"]
          id?: string
          program_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          training_days?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_program_enrollments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "dryland_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_session_completions: {
        Row: {
          athlete_id: string
          completed_at: string
          duration_actual_seconds: number | null
          enrollment_id: string | null
          id: string
          notes: string | null
          session_id: string
        }
        Insert: {
          athlete_id: string
          completed_at?: string
          duration_actual_seconds?: number | null
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          session_id: string
        }
        Update: {
          athlete_id?: string
          completed_at?: string
          duration_actual_seconds?: number | null
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_session_completions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_session_completions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "athlete_program_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_session_completions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dryland_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          id: string
          marked_at: string
          method: string
          present: boolean
          registration_id: string
          session_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          method?: string
          present?: boolean
          registration_id: string
          session_id: string
        }
        Update: {
          id?: string
          marked_at?: string
          method?: string
          present?: boolean
          registration_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "attendee_payment_status"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "attendance_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "camp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendees: {
        Row: {
          birthday: string | null
          contact_id: string | null
          created_at: string
          equipment_size: string | null
          full_name: string
          gender: string | null
          handedness: string | null
          id: string
          jersey_number: string | null
          owner_id: string
          position: string | null
          preferred_position: Database["public"]["Enums"]["dryland_position"]
          skill_level: string | null
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          contact_id?: string | null
          created_at?: string
          equipment_size?: string | null
          full_name: string
          gender?: string | null
          handedness?: string | null
          id?: string
          jersey_number?: string | null
          owner_id: string
          position?: string | null
          preferred_position?: Database["public"]["Enums"]["dryland_position"]
          skill_level?: string | null
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          contact_id?: string | null
          created_at?: string
          equipment_size?: string | null
          full_name?: string
          gender?: string | null
          handedness?: string | null
          id?: string
          jersey_number?: string | null
          owner_id?: string
          position?: string | null
          preferred_position?: Database["public"]["Enums"]["dryland_position"]
          skill_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      authorized_caregivers: {
        Row: {
          attendee_id: string
          created_at: string
          full_name: string
          id: string
          notes: string | null
          phone: string
          relationship: string
          updated_at: string
        }
        Insert: {
          attendee_id: string
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          relationship: string
          updated_at?: string
        }
        Update: {
          attendee_id?: string
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorized_caregivers_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          audience_id: string | null
          audience_type: string
          body: string
          channel_email: boolean
          channel_push: boolean
          channel_sms: boolean
          created_at: string
          id: string
          owner_id: string
          reach: number
          scheduled_for: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_id?: string | null
          audience_type?: string
          body: string
          channel_email?: boolean
          channel_push?: boolean
          channel_sms?: boolean
          created_at?: string
          id?: string
          owner_id: string
          reach?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_id?: string | null
          audience_type?: string
          body?: string
          channel_email?: boolean
          channel_push?: boolean
          channel_sms?: boolean
          created_at?: string
          id?: string
          owner_id?: string
          reach?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      camp_custom_fields: {
        Row: {
          camp_id: string
          created_at: string
          field_type: string
          id: string
          label: string
          options: string[]
          required: boolean
          sort_order: number
        }
        Insert: {
          camp_id: string
          created_at?: string
          field_type: string
          id?: string
          label: string
          options?: string[]
          required?: boolean
          sort_order?: number
        }
        Update: {
          camp_id?: string
          created_at?: string
          field_type?: string
          id?: string
          label?: string
          options?: string[]
          required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "camp_custom_fields_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_media: {
        Row: {
          camp_id: string
          created_at: string
          id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          camp_id: string
          created_at?: string
          id?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          camp_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_media_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_sessions: {
        Row: {
          camp_id: string
          created_at: string
          end_time: string | null
          id: string
          session_date: string
          sort_order: number
          start_time: string | null
        }
        Insert: {
          camp_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          session_date: string
          sort_order?: number
          start_time?: string | null
        }
        Update: {
          camp_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          session_date?: string
          sort_order?: number
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_sessions_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_staff: {
        Row: {
          camp_id: string
          created_at: string
          id: string
          team_member_id: string
        }
        Insert: {
          camp_id: string
          created_at?: string
          id?: string
          team_member_id: string
        }
        Update: {
          camp_id?: string
          created_at?: string
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_staff_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_staff_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_template_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          session_name: string | null
          session_snapshot: Json | null
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          session_name?: string | null
          session_snapshot?: Json | null
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          session_name?: string | null
          session_snapshot?: Json | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_template_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "camp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_templates: {
        Row: {
          created_at: string
          description: string | null
          folder_id: string | null
          id: string
          name: string
          num_days: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          name: string
          num_days?: number
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          num_days?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_templates_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "playbook_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_update_athlete_tags: {
        Row: {
          athlete_id: string
          update_id: string
        }
        Insert: {
          athlete_id: string
          update_id: string
        }
        Update: {
          athlete_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_update_athlete_tags_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_update_athlete_tags_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "camp_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_update_media: {
        Row: {
          created_at: string
          display_order: number
          duration_seconds: number | null
          id: string
          media_type: Database["public"]["Enums"]["camp_update_media_type"]
          thumbnail_url: string | null
          update_id: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          duration_seconds?: number | null
          id?: string
          media_type: Database["public"]["Enums"]["camp_update_media_type"]
          thumbnail_url?: string | null
          update_id: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          duration_seconds?: number | null
          id?: string
          media_type?: Database["public"]["Enums"]["camp_update_media_type"]
          thumbnail_url?: string | null
          update_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_update_media_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "camp_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_update_reactions: {
        Row: {
          created_at: string
          parent_id: string
          update_id: string
        }
        Insert: {
          created_at?: string
          parent_id: string
          update_id: string
        }
        Update: {
          created_at?: string
          parent_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_update_reactions_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "camp_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_updates: {
        Row: {
          camp_day_date: string | null
          camp_id: string
          caption: string | null
          created_at: string
          id: string
          post_type: Database["public"]["Enums"]["camp_update_post_type"]
          posted_by: string
          updated_at: string
        }
        Insert: {
          camp_day_date?: string | null
          camp_id: string
          caption?: string | null
          created_at?: string
          id?: string
          post_type?: Database["public"]["Enums"]["camp_update_post_type"]
          posted_by: string
          updated_at?: string
        }
        Update: {
          camp_day_date?: string | null
          camp_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          post_type?: Database["public"]["Enums"]["camp_update_post_type"]
          posted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_updates_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          absent_alert: boolean
          absent_alert_minutes: number
          address: string | null
          age_group: string | null
          capacity: number
          city: string | null
          confirmation_sms: boolean
          created_at: string
          description: string | null
          early_bird_expires_at: string | null
          early_bird_price_cents: number | null
          end_date: string | null
          end_time: string | null
          featured: boolean
          format: Database["public"]["Enums"]["camp_format"]
          hero_image: string | null
          id: string
          location_type: Database["public"]["Enums"]["location_type"]
          name: string
          owner_id: string
          payment_plan: Database["public"]["Enums"]["payment_plan"]
          postal_code: string | null
          price_cents: number
          reminder_1day: boolean
          reminder_7day: boolean
          reminder_morning: boolean
          show_remaining: boolean
          sibling_discount: boolean
          sibling_discount_percent: number
          skill_level: string | null
          slug: string
          sport_type: string | null
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["camp_status"]
          tags: string[]
          timezone: string
          updated_at: string
          venue_name: string | null
          waiver_required: boolean
          waiver_text: string | null
          waiver_url: string | null
        }
        Insert: {
          absent_alert?: boolean
          absent_alert_minutes?: number
          address?: string | null
          age_group?: string | null
          capacity?: number
          city?: string | null
          confirmation_sms?: boolean
          created_at?: string
          description?: string | null
          early_bird_expires_at?: string | null
          early_bird_price_cents?: number | null
          end_date?: string | null
          end_time?: string | null
          featured?: boolean
          format?: Database["public"]["Enums"]["camp_format"]
          hero_image?: string | null
          id?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          name: string
          owner_id: string
          payment_plan?: Database["public"]["Enums"]["payment_plan"]
          postal_code?: string | null
          price_cents?: number
          reminder_1day?: boolean
          reminder_7day?: boolean
          reminder_morning?: boolean
          show_remaining?: boolean
          sibling_discount?: boolean
          sibling_discount_percent?: number
          skill_level?: string | null
          slug: string
          sport_type?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["camp_status"]
          tags?: string[]
          timezone?: string
          updated_at?: string
          venue_name?: string | null
          waiver_required?: boolean
          waiver_text?: string | null
          waiver_url?: string | null
        }
        Update: {
          absent_alert?: boolean
          absent_alert_minutes?: number
          address?: string | null
          age_group?: string | null
          capacity?: number
          city?: string | null
          confirmation_sms?: boolean
          created_at?: string
          description?: string | null
          early_bird_expires_at?: string | null
          early_bird_price_cents?: number | null
          end_date?: string | null
          end_time?: string | null
          featured?: boolean
          format?: Database["public"]["Enums"]["camp_format"]
          hero_image?: string | null
          id?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          name?: string
          owner_id?: string
          payment_plan?: Database["public"]["Enums"]["payment_plan"]
          postal_code?: string | null
          price_cents?: number
          reminder_1day?: boolean
          reminder_7day?: boolean
          reminder_morning?: boolean
          show_remaining?: boolean
          sibling_discount?: boolean
          sibling_discount_percent?: number
          skill_level?: string | null
          slug?: string
          sport_type?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["camp_status"]
          tags?: string[]
          timezone?: string
          updated_at?: string
          venue_name?: string | null
          waiver_required?: boolean
          waiver_text?: string | null
          waiver_url?: string | null
        }
        Relationships: []
      }
      coach_game_notes: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          id: string
          pep_talk: string | null
          period_notes: Json
          post_game_notes: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          pep_talk?: string | null
          period_notes?: Json
          post_game_notes?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          pep_talk?: string | null
          period_notes?: Json
          post_game_notes?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_game_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_game_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_marketing_settings: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          meta_pixel_id: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          meta_pixel_id?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          meta_pixel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_verifications: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_line2: string | null
          address_postal: string | null
          address_region: string | null
          approved_at: string | null
          approved_by: string | null
          checkr_candidate_id: string | null
          checkr_report_id: string | null
          consent_given_at: string | null
          created_at: string
          date_of_birth: string | null
          expires_at: string | null
          fee_amount_cents: number | null
          fee_paid_at: string | null
          id: string
          legal_first_name: string | null
          legal_last_name: string | null
          rejected_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal?: string | null
          address_region?: string | null
          approved_at?: string | null
          approved_by?: string | null
          checkr_candidate_id?: string | null
          checkr_report_id?: string | null
          consent_given_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          expires_at?: string | null
          fee_amount_cents?: number | null
          fee_paid_at?: string | null
          id?: string
          legal_first_name?: string | null
          legal_last_name?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal?: string | null
          address_region?: string | null
          approved_at?: string | null
          approved_by?: string | null
          checkr_candidate_id?: string | null
          checkr_report_id?: string | null
          consent_given_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          expires_at?: string | null
          fee_amount_cents?: number | null
          fee_paid_at?: string | null
          id?: string
          legal_first_name?: string | null
          legal_last_name?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      combine_public_shares: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          revoked_at?: string | null
          token?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "combine_public_shares_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      combine_scores: {
        Row: {
          athlete_id: string
          category: Database["public"]["Enums"]["combine_category"]
          global_rank: number | null
          id: string
          percentile: number | null
          score: number
          updated_at: string
        }
        Insert: {
          athlete_id: string
          category: Database["public"]["Enums"]["combine_category"]
          global_rank?: number | null
          id?: string
          percentile?: number | null
          score: number
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          category?: Database["public"]["Enums"]["combine_category"]
          global_rank?: number | null
          id?: string
          percentile?: number | null
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combine_scores_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      combine_tests: {
        Row: {
          athlete_id: string
          category: Database["public"]["Enums"]["combine_category"]
          created_at: string
          hardware_source: string | null
          id: string
          metric: string
          recorded_by: string | null
          tested_at: string
          unit: string
          value: number
        }
        Insert: {
          athlete_id: string
          category: Database["public"]["Enums"]["combine_category"]
          created_at?: string
          hardware_source?: string | null
          id?: string
          metric: string
          recorded_by?: string | null
          tested_at?: string
          unit: string
          value: number
        }
        Update: {
          athlete_id?: string
          category?: Database["public"]["Enums"]["combine_category"]
          created_at?: string
          hardware_source?: string | null
          id?: string
          metric?: string
          recorded_by?: string | null
          tested_at?: string
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "combine_tests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          email_opt_in: boolean
          full_name: string
          id: string
          joined_at: string
          notes: string | null
          owner_id: string
          phone: string | null
          sms_opt_in: boolean
          subscribed: boolean
          tags: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_opt_in?: boolean
          full_name: string
          id?: string
          joined_at?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          sms_opt_in?: boolean
          subscribed?: boolean
          tags?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_opt_in?: boolean
          full_name?: string
          id?: string
          joined_at?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          sms_opt_in?: boolean
          subscribed?: boolean
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          camp_id: string | null
          created_at: string
          created_by: string
          id: string
          type: Database["public"]["Enums"]["conversation_type"]
        }
        Insert: {
          camp_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          type: Database["public"]["Enums"]["conversation_type"]
        }
        Update: {
          camp_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          type?: Database["public"]["Enums"]["conversation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          amount_off_cents: number | null
          camp_id: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          owner_id: string
          percent_off: number | null
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          amount_off_cents?: number | null
          camp_id?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id: string
          percent_off?: number | null
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          amount_off_cents?: number | null
          camp_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id?: string
          percent_off?: number | null
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_rsvps: {
        Row: {
          camp_id: string
          camp_session_id: string
          created_at: string
          id: string
          overridden_at: string | null
          overridden_by: string | null
          reason: string | null
          registration_id: string
          reminder_evening_sent_at: string | null
          reminder_morning_sent_at: string | null
          responded_at: string | null
          rsvp_token: string
          status: string
          updated_at: string
        }
        Insert: {
          camp_id: string
          camp_session_id: string
          created_at?: string
          id?: string
          overridden_at?: string | null
          overridden_by?: string | null
          reason?: string | null
          registration_id: string
          reminder_evening_sent_at?: string | null
          reminder_morning_sent_at?: string | null
          responded_at?: string | null
          rsvp_token?: string
          status?: string
          updated_at?: string
        }
        Update: {
          camp_id?: string
          camp_session_id?: string
          created_at?: string
          id?: string
          overridden_at?: string | null
          overridden_by?: string | null
          reason?: string | null
          registration_id?: string
          reminder_evening_sent_at?: string | null
          reminder_morning_sent_at?: string | null
          responded_at?: string | null
          rsvp_token?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_rsvps_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_rsvps_camp_session_id_fkey"
            columns: ["camp_session_id"]
            isOneToOne: false
            referencedRelation: "camp_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_rsvps_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "attendee_payment_status"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "daily_rsvps_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      drills: {
        Row: {
          age_group: string | null
          category_id: string | null
          coaching_points: string | null
          created_at: string
          diagram_url: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_minutes: number | null
          equipment_needed: string | null
          folder_id: string | null
          full_description: string | null
          id: string
          is_premium: boolean
          is_published: boolean
          owner_id: string | null
          short_description: string | null
          skill_focus: string | null
          slug: string
          sort_order: number
          source_credit: string | null
          source_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          age_group?: string | null
          category_id?: string | null
          coaching_points?: string | null
          created_at?: string
          diagram_url?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_minutes?: number | null
          equipment_needed?: string | null
          folder_id?: string | null
          full_description?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          owner_id?: string | null
          short_description?: string | null
          skill_focus?: string | null
          slug: string
          sort_order?: number
          source_credit?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          age_group?: string | null
          category_id?: string | null
          coaching_points?: string | null
          created_at?: string
          diagram_url?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_minutes?: number | null
          equipment_needed?: string | null
          folder_id?: string | null
          full_description?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          owner_id?: string | null
          short_description?: string | null
          skill_focus?: string | null
          slug?: string
          sort_order?: number
          source_credit?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "drill_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dryland_exercises: {
        Row: {
          created_at: string
          display_order: number
          duration_seconds: number | null
          id: string
          instruction_text: string | null
          name: string
          reps: number | null
          rest_seconds: number | null
          session_id: string
          sets: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          duration_seconds?: number | null
          id?: string
          instruction_text?: string | null
          name: string
          reps?: number | null
          rest_seconds?: number | null
          session_id: string
          sets?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          duration_seconds?: number | null
          id?: string
          instruction_text?: string | null
          name?: string
          reps?: number | null
          rest_seconds?: number | null
          session_id?: string
          sets?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dryland_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dryland_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dryland_program_sessions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          program_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          program_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          program_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dryland_program_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "dryland_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dryland_program_sessions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "dryland_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      dryland_program_weeks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          program_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          program_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          program_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dryland_program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "dryland_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      dryland_programs: {
        Row: {
          age_group_max: number
          age_group_min: number
          avg_session_minutes: number
          category: Database["public"]["Enums"]["dryland_category"]
          created_at: string
          created_by_admin: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["dryland_difficulty"]
          id: string
          is_published: boolean
          launch_label: string | null
          name: string
          position: Database["public"]["Enums"]["dryland_position"] | null
          season: Database["public"]["Enums"]["dryland_program_season"] | null
          session_count: number
          status: Database["public"]["Enums"]["dryland_program_status"]
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          age_group_max?: number
          age_group_min?: number
          avg_session_minutes?: number
          category: Database["public"]["Enums"]["dryland_category"]
          created_at?: string
          created_by_admin?: string | null
          description?: string | null
          difficulty: Database["public"]["Enums"]["dryland_difficulty"]
          id?: string
          is_published?: boolean
          launch_label?: string | null
          name: string
          position?: Database["public"]["Enums"]["dryland_position"] | null
          season?: Database["public"]["Enums"]["dryland_program_season"] | null
          session_count?: number
          status?: Database["public"]["Enums"]["dryland_program_status"]
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          age_group_max?: number
          age_group_min?: number
          avg_session_minutes?: number
          category?: Database["public"]["Enums"]["dryland_category"]
          created_at?: string
          created_by_admin?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["dryland_difficulty"]
          id?: string
          is_published?: boolean
          launch_label?: string | null
          name?: string
          position?: Database["public"]["Enums"]["dryland_position"] | null
          season?: Database["public"]["Enums"]["dryland_program_season"] | null
          session_count?: number
          status?: Database["public"]["Enums"]["dryland_program_status"]
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dryland_sessions: {
        Row: {
          created_at: string
          day_number: number
          display_order: number
          duration_minutes: number
          id: string
          name: string
          program_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          day_number?: number
          display_order?: number
          duration_minutes?: number
          id?: string
          name: string
          program_id: string
          week_number?: number
        }
        Update: {
          created_at?: string
          day_number?: number
          display_order?: number
          duration_minutes?: number
          id?: string
          name?: string
          program_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dryland_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "dryland_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      dryland_streaks: {
        Row: {
          athlete_id: string
          created_at: string
          current_streak_weeks: number
          id: string
          last_active_week: string | null
          longest_streak_weeks: number
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          current_streak_weeks?: number
          id?: string
          last_active_week?: string | null
          longest_streak_weeks?: number
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          current_streak_weeks?: number
          id?: string
          last_active_week?: string | null
          longest_streak_weeks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dryland_streaks_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      dryland_videos: {
        Row: {
          age_group: string | null
          category: Database["public"]["Enums"]["dryland_video_category"]
          created_at: string
          difficulty: Database["public"]["Enums"]["dryland_difficulty"]
          duration_minutes: number
          id: string
          instructor_name: string | null
          is_featured: boolean
          is_published: boolean
          position: Database["public"]["Enums"]["dryland_position"]
          published_at: string
          thumbnail_url: string | null
          title: string
          total_seconds: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          age_group?: string | null
          category: Database["public"]["Enums"]["dryland_video_category"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["dryland_difficulty"]
          duration_minutes?: number
          id?: string
          instructor_name?: string | null
          is_featured?: boolean
          is_published?: boolean
          position?: Database["public"]["Enums"]["dryland_position"]
          published_at?: string
          thumbnail_url?: string | null
          title: string
          total_seconds?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          age_group?: string | null
          category?: Database["public"]["Enums"]["dryland_video_category"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["dryland_difficulty"]
          duration_minutes?: number
          id?: string
          instructor_name?: string | null
          is_featured?: boolean
          is_published?: boolean
          position?: Database["public"]["Enums"]["dryland_position"]
          published_at?: string
          thumbnail_url?: string | null
          title?: string
          total_seconds?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      dryland_watch_progress: {
        Row: {
          athlete_id: string
          completed: boolean
          created_at: string
          id: string
          last_watched_at: string
          team_id: string | null
          updated_at: string
          video_id: string
          watched_seconds: number
        }
        Insert: {
          athlete_id: string
          completed?: boolean
          created_at?: string
          id?: string
          last_watched_at?: string
          team_id?: string | null
          updated_at?: string
          video_id: string
          watched_seconds?: number
        }
        Update: {
          athlete_id?: string
          completed?: boolean
          created_at?: string
          id?: string
          last_watched_at?: string
          team_id?: string | null
          updated_at?: string
          video_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "dryland_watch_progress_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dryland_watch_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dryland_watch_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "dryland_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience_filter: Json
          body: string
          click_count: number
          created_at: string
          id: string
          name: string
          open_count: number
          owner_id: string
          scheduled_for: string | null
          sent_count: number
          status: Database["public"]["Enums"]["email_campaign_status"]
          subject: string
          template: string | null
          updated_at: string
        }
        Insert: {
          audience_filter?: Json
          body: string
          click_count?: number
          created_at?: string
          id?: string
          name: string
          open_count?: number
          owner_id: string
          scheduled_for?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["email_campaign_status"]
          subject: string
          template?: string | null
          updated_at?: string
        }
        Update: {
          audience_filter?: Json
          body?: string
          click_count?: number
          created_at?: string
          id?: string
          name?: string
          open_count?: number
          owner_id?: string
          scheduled_for?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["email_campaign_status"]
          subject?: string
          template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_marketing_connections: {
        Row: {
          account_name: string | null
          api_key: string | null
          api_server: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          list_id: string | null
          list_name: string | null
          owner_id: string
          provider: Database["public"]["Enums"]["email_marketing_provider"]
          status: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          api_key?: string | null
          api_server?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          list_id?: string | null
          list_name?: string | null
          owner_id: string
          provider: Database["public"]["Enums"]["email_marketing_provider"]
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          api_key?: string | null
          api_server?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          list_id?: string | null
          list_name?: string | null
          owner_id?: string
          provider?: Database["public"]["Enums"]["email_marketing_provider"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_sequence_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string
          current_step: number
          enrolled_at: string
          id: string
          next_send_at: string | null
          sequence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          current_step?: number
          enrolled_at?: string
          id?: string
          next_send_at?: string | null
          sequence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          current_step?: number
          enrolled_at?: string
          id?: string
          next_send_at?: string | null
          sequence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          body: string
          created_at: string
          delay_days: number
          delay_hours: number
          id: string
          sequence_id: string
          step_order: number
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          sequence_id: string
          step_order?: number
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          sequence_id?: string
          step_order?: number
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          inactivity_days: number | null
          name: string
          owner_id: string
          trigger: string
          trigger_camp_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          inactivity_days?: number | null
          name: string
          owner_id: string
          trigger?: string
          trigger_camp_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          inactivity_days?: number | null
          name?: string
          owner_id?: string
          trigger?: string
          trigger_camp_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_trigger_camp_id_fkey"
            columns: ["trigger_camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          compete_level: number | null
          created_at: string
          hockey_sense: number | null
          id: string
          notes: string | null
          passing: number | null
          puck_control: number | null
          registration_id: string
          sent_to_parent_at: string | null
          shooting: number | null
          skating: number | null
          updated_at: string
        }
        Insert: {
          compete_level?: number | null
          created_at?: string
          hockey_sense?: number | null
          id?: string
          notes?: string | null
          passing?: number | null
          puck_control?: number | null
          registration_id: string
          sent_to_parent_at?: string | null
          shooting?: number | null
          skating?: number | null
          updated_at?: string
        }
        Update: {
          compete_level?: number | null
          created_at?: string
          hockey_sense?: number | null
          id?: string
          notes?: string | null
          passing?: number | null
          puck_control?: number | null
          registration_id?: string
          sent_to_parent_at?: string | null
          shooting?: number | null
          skating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "attendee_payment_status"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "evaluations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      game_highlight_reels: {
        Row: {
          clip_ids: Json
          created_at: string
          created_by: string
          event_id: string
          id: string
          is_shared: boolean
          team_id: string
          title: string
        }
        Insert: {
          clip_ids?: Json
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          is_shared?: boolean
          team_id: string
          title: string
        }
        Update: {
          clip_ids?: Json
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          is_shared?: boolean
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_highlight_reels_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_highlight_reels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_lineups: {
        Row: {
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          is_shared: boolean
          pk_units: Json
          positions: Json
          pp_units: Json
          scratches: Json
          team_id: string
          template_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          is_shared?: boolean
          pk_units?: Json
          positions?: Json
          pp_units?: Json
          scratches?: Json
          team_id: string
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          is_shared?: boolean
          pk_units?: Json
          positions?: Json
          pp_units?: Json
          scratches?: Json
          team_id?: string
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_lineups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_media: {
        Row: {
          athlete_tags: Json
          caption: string | null
          created_at: string
          duration_seconds: number | null
          event_id: string
          id: string
          label: Database["public"]["Enums"]["game_media_label"]
          media_type: Database["public"]["Enums"]["game_media_type"]
          team_id: string
          thumbnail_url: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          athlete_tags?: Json
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_id: string
          id?: string
          label?: Database["public"]["Enums"]["game_media_label"]
          media_type: Database["public"]["Enums"]["game_media_type"]
          team_id: string
          thumbnail_url?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          athlete_tags?: Json
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_id?: string
          id?: string
          label?: Database["public"]["Enums"]["game_media_label"]
          media_type?: Database["public"]["Enums"]["game_media_type"]
          team_id?: string
          thumbnail_url?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_media_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_plans: {
        Row: {
          created_at: string
          created_by: string
          drill_ids: Json
          event_id: string
          id: string
          matchups: Json
          opponent_notes: string | null
          our_gameplan: string | null
          team_id: string
          updated_at: string
          video_clip_ids: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          drill_ids?: Json
          event_id: string
          id?: string
          matchups?: Json
          opponent_notes?: string | null
          our_gameplan?: string | null
          team_id: string
          updated_at?: string
          video_clip_ids?: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          drill_ids?: Json
          event_id?: string
          id?: string
          matchups?: Json
          opponent_notes?: string | null
          our_gameplan?: string | null
          team_id?: string
          updated_at?: string
          video_clip_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "game_plans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ice_import_batches: {
        Row: {
          created_at: string
          id: string
          imported_at: string
          owner_id: string
          source_file_name: string | null
          source_file_url: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_at?: string
          owner_id: string
          source_file_name?: string | null
          source_file_url?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_at?: string
          owner_id?: string
          source_file_name?: string | null
          source_file_url?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      ice_slots: {
        Row: {
          ambiguous: boolean
          batch_id: string | null
          booked_by_coach_id: string | null
          camp_id: string | null
          created_at: string
          end_time: string
          id: string
          notes: string | null
          owner_id: string
          rink_id: string | null
          slot_date: string
          start_time: string
          surface_type: string
          updated_at: string
        }
        Insert: {
          ambiguous?: boolean
          batch_id?: string | null
          booked_by_coach_id?: string | null
          camp_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          owner_id: string
          rink_id?: string | null
          slot_date: string
          start_time: string
          surface_type?: string
          updated_at?: string
        }
        Update: {
          ambiguous?: boolean
          batch_id?: string | null
          booked_by_coach_id?: string | null
          camp_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          owner_id?: string
          rink_id?: string | null
          slot_date?: string
          start_time?: string
          surface_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ice_slots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ice_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ice_slots_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ice_slots_rink_id_fkey"
            columns: ["rink_id"]
            isOneToOne: false
            referencedRelation: "rinks"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          athlete_media_id: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          image_path: string | null
          pinned: boolean
          read_by: Json
          sender_id: string
        }
        Insert: {
          athlete_media_id?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_path?: string | null
          pinned?: boolean
          read_by?: Json
          sender_id: string
        }
        Update: {
          athlete_media_id?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_path?: string | null
          pinned?: boolean
          read_by?: Json
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_athlete_media_id_fkey"
            columns: ["athlete_media_id"]
            isOneToOne: false
            referencedRelation: "athlete_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          id: string
          payment_plan_installments: number
          registration_id: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          payment_plan_installments?: number
          registration_id: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent?: string | null
          total_cents?: number
          updated_at?: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          payment_plan_installments?: number
          registration_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "attendee_payment_status"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "orders_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_installments: {
        Row: {
          amount_cents: number
          created_at: string
          due_date: string
          id: string
          owner_id: string
          paid_at: string | null
          registration_id: string
          sequence: number
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          due_date: string
          id?: string
          owner_id: string
          paid_at?: string | null
          registration_id: string
          sequence: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          due_date?: string
          id?: string
          owner_id?: string
          paid_at?: string | null
          registration_id?: string
          sequence?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "attendee_payment_status"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "payment_installments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          owner_id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          owner_id: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          owner_id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Relationships: []
      }
      playbook_folders: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_plan_items: {
        Row: {
          display_order: number
          drill_id: string | null
          duration_minutes: number | null
          id: string
          item_type: Database["public"]["Enums"]["practice_item_type"]
          note_text: string | null
          plan_id: string
          session_id: string | null
        }
        Insert: {
          display_order?: number
          drill_id?: string | null
          duration_minutes?: number | null
          id?: string
          item_type: Database["public"]["Enums"]["practice_item_type"]
          note_text?: string | null
          plan_id: string
          session_id?: string | null
        }
        Update: {
          display_order?: number
          drill_id?: string | null
          duration_minutes?: number | null
          id?: string
          item_type?: Database["public"]["Enums"]["practice_item_type"]
          note_text?: string | null
          plan_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_plan_items_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "practice_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_plans: {
        Row: {
          coach_id: string
          created_at: string
          event_id: string | null
          id: string
          team_id: string
          template_name: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          team_id: string
          template_name?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          team_id?: string
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_plans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          marketplace_visible: boolean
          meta_pixel_id: string | null
          min_buffer_minutes: number
          postal_code: string | null
          slug: string | null
          sms_provider: string
          sms_sender_name: string | null
          sms_sender_phone: string | null
          sms_signature: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at: string
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          marketplace_visible?: boolean
          meta_pixel_id?: string | null
          min_buffer_minutes?: number
          postal_code?: string | null
          slug?: string | null
          sms_provider?: string
          sms_sender_name?: string | null
          sms_sender_phone?: string | null
          sms_signature?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          marketplace_visible?: boolean
          meta_pixel_id?: string | null
          min_buffer_minutes?: number
          postal_code?: string | null
          slug?: string | null
          sms_provider?: string
          sms_sender_name?: string | null
          sms_sender_phone?: string | null
          sms_signature?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
        }
        Relationships: []
      }
      program_drills: {
        Row: {
          created_at: string
          day_number: number
          drill_id: string
          id: string
          notes: string | null
          program_id: string
          sequence_order: number
        }
        Insert: {
          created_at?: string
          day_number?: number
          drill_id: string
          id?: string
          notes?: string | null
          program_id: string
          sequence_order?: number
        }
        Update: {
          created_at?: string
          day_number?: number
          drill_id?: string
          id?: string
          notes?: string | null
          program_id?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_drills_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_drills_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_recommendations: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          id: string
          message: string | null
          program_id: string
          status: Database["public"]["Enums"]["recommendation_status"]
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string
          id?: string
          message?: string | null
          program_id: string
          status?: Database["public"]["Enums"]["recommendation_status"]
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          message?: string | null
          program_id?: string
          status?: Database["public"]["Enums"]["recommendation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "program_recommendations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_recommendations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "dryland_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          amount_cents: number
          attendee_id: string | null
          booking_group_id: string | null
          camp_id: string
          contact_id: string | null
          created_at: string
          custom_field_values: Json
          id: string
          order_number: string
          sibling_discount_cents: number
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          attendee_id?: string | null
          booking_group_id?: string | null
          camp_id: string
          contact_id?: string | null
          created_at?: string
          custom_field_values?: Json
          id?: string
          order_number?: string
          sibling_discount_cents?: number
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          attendee_id?: string | null
          booking_group_id?: string | null
          camp_id?: string
          contact_id?: string | null
          created_at?: string
          custom_field_values?: Json
          id?: string
          order_number?: string
          sibling_discount_cents?: number
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      rinks: {
        Row: {
          address: string | null
          color: string
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          body: string
          camp_id: string | null
          channel: string
          contact_id: string | null
          created_at: string
          error: string | null
          id: string
          kind: string
          owner_id: string
          registration_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          body: string
          camp_id?: string | null
          channel: string
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          owner_id: string
          registration_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string
          camp_id?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          owner_id?: string
          registration_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "attendee_payment_status"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "scheduled_messages_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          body: string
          camp_id: string | null
          created_at: string
          id: string
          kind: string
          owner_id: string
          recipient_name: string | null
          recipient_phone: string | null
          registration_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          body: string
          camp_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          owner_id: string
          recipient_name?: string | null
          recipient_phone?: string | null
          registration_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          camp_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          registration_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "attendee_payment_status"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "sms_logs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_name: string | null
          status: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_name?: string | null
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_name?: string | null
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_duties: {
        Row: {
          assigned_to_parent_id: string | null
          created_at: string
          duty_type: string
          event_id: string
          id: string
          is_open_signup: boolean
          notes: string | null
        }
        Insert: {
          assigned_to_parent_id?: string | null
          created_at?: string
          duty_type: string
          event_id: string
          id?: string
          is_open_signup?: boolean
          notes?: string | null
        }
        Update: {
          assigned_to_parent_id?: string | null
          created_at?: string
          duty_type?: string
          event_id?: string
          id?: string
          is_open_signup?: boolean
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_duties_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
        ]
      }
      team_event_attendance: {
        Row: {
          event_id: string
          id: string
          marked_at: string
          marked_by: string | null
          status: Database["public"]["Enums"]["team_attendance_status"]
          team_player_id: string
        }
        Insert: {
          event_id: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          status: Database["public"]["Enums"]["team_attendance_status"]
          team_player_id: string
        }
        Update: {
          event_id?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          status?: Database["public"]["Enums"]["team_attendance_status"]
          team_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_event_attendance_team_player_id_fkey"
            columns: ["team_player_id"]
            isOneToOne: false
            referencedRelation: "team_players"
            referencedColumns: ["id"]
          },
        ]
      }
      team_event_rsvps: {
        Row: {
          event_id: string
          id: string
          note: string | null
          parent_user_id: string | null
          responded_at: string
          response: Database["public"]["Enums"]["team_rsvp_response"]
          rsvp_token: string
          team_player_id: string
        }
        Insert: {
          event_id: string
          id?: string
          note?: string | null
          parent_user_id?: string | null
          responded_at?: string
          response: Database["public"]["Enums"]["team_rsvp_response"]
          rsvp_token?: string
          team_player_id: string
        }
        Update: {
          event_id?: string
          id?: string
          note?: string | null
          parent_user_id?: string | null
          responded_at?: string
          response?: Database["public"]["Enums"]["team_rsvp_response"]
          rsvp_token?: string
          team_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_event_rsvps_team_player_id_fkey"
            columns: ["team_player_id"]
            isOneToOne: false
            referencedRelation: "team_players"
            referencedColumns: ["id"]
          },
        ]
      }
      team_events: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["team_event_type"]
          home_away: Database["public"]["Enums"]["team_home_away"] | null
          id: string
          lineup_shared: boolean
          notes: string | null
          opponent_name: string | null
          rsvp_lock_minutes: number
          start_time: string | null
          team_id: string
          title: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["team_event_type"]
          home_away?: Database["public"]["Enums"]["team_home_away"] | null
          id?: string
          lineup_shared?: boolean
          notes?: string | null
          opponent_name?: string | null
          rsvp_lock_minutes?: number
          start_time?: string | null
          team_id: string
          title?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["team_event_type"]
          home_away?: Database["public"]["Enums"]["team_home_away"] | null
          id?: string
          lineup_shared?: boolean
          notes?: string | null
          opponent_name?: string | null
          rsvp_lock_minutes?: number
          start_time?: string | null
          team_id?: string
          title?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          athlete_dob: string | null
          athlete_first_name: string
          athlete_last_name: string
          id: string
          invite_token: string
          invited_at: string
          jersey_number: string | null
          joined_at: string | null
          parent_submission: Json | null
          parent1_email: string | null
          parent1_name: string | null
          parent1_phone: string | null
          parent2_email: string | null
          parent2_name: string | null
          position: string | null
          status: Database["public"]["Enums"]["team_invite_status"]
          submitted_at: string | null
          team_id: string
        }
        Insert: {
          athlete_dob?: string | null
          athlete_first_name: string
          athlete_last_name: string
          id?: string
          invite_token?: string
          invited_at?: string
          jersey_number?: string | null
          joined_at?: string | null
          parent_submission?: Json | null
          parent1_email?: string | null
          parent1_name?: string | null
          parent1_phone?: string | null
          parent2_email?: string | null
          parent2_name?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["team_invite_status"]
          submitted_at?: string | null
          team_id: string
        }
        Update: {
          athlete_dob?: string | null
          athlete_first_name?: string
          athlete_last_name?: string
          id?: string
          invite_token?: string
          invited_at?: string
          jersey_number?: string | null
          joined_at?: string | null
          parent_submission?: Json | null
          parent1_email?: string | null
          parent1_name?: string | null
          parent1_phone?: string | null
          parent2_email?: string | null
          parent2_name?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["team_invite_status"]
          submitted_at?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_lineups: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          positions: Json
          shared: boolean
          team_id: string
          template_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          positions?: Json
          shared?: boolean
          team_id: string
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          positions?: Json
          shared?: boolean
          team_id?: string
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_lineups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          home_area_label: string | null
          home_area_lat: number | null
          home_area_lng: number | null
          id: string
          member_user_id: string | null
          owner_id: string
          permission_level: Database["public"]["Enums"]["team_permission"]
          phone: string | null
          status: Database["public"]["Enums"]["team_member_status"]
          title: string
        }
        Insert: {
          created_at?: string
          email: string
          home_area_label?: string | null
          home_area_lat?: number | null
          home_area_lng?: number | null
          id?: string
          member_user_id?: string | null
          owner_id: string
          permission_level?: Database["public"]["Enums"]["team_permission"]
          phone?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          title?: string
        }
        Update: {
          created_at?: string
          email?: string
          home_area_label?: string | null
          home_area_lat?: number | null
          home_area_lng?: number | null
          id?: string
          member_user_id?: string | null
          owner_id?: string
          permission_level?: Database["public"]["Enums"]["team_permission"]
          phone?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          title?: string
        }
        Relationships: []
      }
      team_players: {
        Row: {
          added_by: string | null
          athlete_id: string | null
          created_at: string
          display_name: string
          id: string
          jersey_number: string | null
          parent_contact_id: string | null
          position: string | null
          team_id: string
        }
        Insert: {
          added_by?: string | null
          athlete_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          jersey_number?: string | null
          parent_contact_id?: string | null
          position?: string | null
          team_id: string
        }
        Update: {
          added_by?: string | null
          athlete_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          jersey_number?: string | null
          parent_contact_id?: string | null
          position?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_parent_contact_id_fkey"
            columns: ["parent_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_stats: {
        Row: {
          assists: number
          games_played: number
          goals: number
          id: string
          penalty_minutes: number
          season: string | null
          team_id: string
          team_player_id: string
          updated_at: string
        }
        Insert: {
          assists?: number
          games_played?: number
          goals?: number
          id?: string
          penalty_minutes?: number
          season?: string | null
          team_id: string
          team_player_id: string
          updated_at?: string
        }
        Update: {
          assists?: number
          games_played?: number
          goals?: number
          id?: string
          penalty_minutes?: number
          season?: string | null
          team_id?: string
          team_player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_stats_team_player_id_fkey"
            columns: ["team_player_id"]
            isOneToOne: false
            referencedRelation: "team_players"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          age_group: string | null
          association_id: string | null
          association_name: string | null
          coach_id: string
          created_at: string
          division: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          season: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          association_id?: string | null
          association_name?: string | null
          coach_id: string
          created_at?: string
          division?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          season?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          association_id?: string | null
          association_name?: string | null
          coach_id?: string
          created_at?: string
          division?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          season?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      training_programs: {
        Row: {
          age_group: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_premium: boolean
          is_published: boolean
          level: Database["public"]["Enums"]["difficulty_level"] | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          is_published?: boolean
          level?: Database["public"]["Enums"]["difficulty_level"] | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          is_published?: boolean
          level?: Database["public"]["Enums"]["difficulty_level"] | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          drill_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drill_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drill_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_annotations: {
        Row: {
          annotation_data: Json | null
          annotation_type: string
          created_at: string
          created_by: string
          frame_timestamp: number | null
          id: string
          media_id: string
          voiceover_url: string | null
        }
        Insert: {
          annotation_data?: Json | null
          annotation_type: string
          created_at?: string
          created_by: string
          frame_timestamp?: number | null
          id?: string
          media_id: string
          voiceover_url?: string | null
        }
        Update: {
          annotation_data?: Json | null
          annotation_type?: string
          created_at?: string
          created_by?: string
          frame_timestamp?: number | null
          id?: string
          media_id?: string
          voiceover_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_annotations_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "athlete_media"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          attendee_id: string | null
          camp_id: string
          claim_expires_at: string | null
          contact_id: string | null
          created_at: string
          id: string
          notified_at: string | null
          position: number
          promoted_at: string | null
          status: Database["public"]["Enums"]["waitlist_status"]
        }
        Insert: {
          attendee_id?: string | null
          camp_id: string
          claim_expires_at?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          position?: number
          promoted_at?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
        }
        Update: {
          attendee_id?: string | null
          camp_id?: string
          claim_expires_at?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          position?: number
          promoted_at?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_signatures: {
        Row: {
          attendee_id: string
          camp_id: string
          created_at: string
          id: string
          ip_address: string | null
          registration_id: string
          signature_data: string
          signature_method: string
          signed_at: string
          signer_name: string
          waiver_text_snapshot: string
        }
        Insert: {
          attendee_id: string
          camp_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          registration_id: string
          signature_data: string
          signature_method: string
          signed_at?: string
          signer_name: string
          waiver_text_snapshot: string
        }
        Update: {
          attendee_id?: string
          camp_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          registration_id?: string
          signature_data?: string
          signature_method?: string
          signed_at?: string
          signer_name?: string
          waiver_text_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "attendee_payment_status"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "waiver_signatures_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attendee_payment_status: {
        Row: {
          attendee_id: string | null
          camp_id: string | null
          contact_id: string | null
          created_at: string | null
          paid_cents: number | null
          payment_status: string | null
          registration_id: string | null
          total_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      public_marketplace_profiles: {
        Row: {
          bio: string | null
          city: string | null
          full_name: string | null
          id: string | null
          marketplace_visible: boolean | null
          slug: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          full_name?: string | null
          id?: string | null
          marketplace_visible?: boolean | null
          slug?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          full_name?: string | null
          id?: string | null
          marketplace_visible?: boolean | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_coach_role: { Args: never; Returns: undefined }
      current_user_contact_ids: { Args: never; Returns: string[] }
      effective_owner_id: { Args: never; Returns: string }
      get_combine_share: { Args: { _token: string }; Returns: Json }
      get_meta_pixel_id: { Args: { _coach_id: string }; Returns: string }
      get_profile_names: {
        Args: { _ids: string[] }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_rsvp_by_token: { Args: { _token: string }; Returns: Json }
      get_team_dryland_leaderboard: {
        Args: { _since: string; _team_id: string }
        Returns: {
          athlete_id: string
          athlete_position: Database["public"]["Enums"]["dryland_position"]
          current_streak_weeks: number
          full_name: string
          longest_streak_weeks: number
          sessions_all_time: number
          sessions_in_window: number
        }[]
      }
      get_team_invite_by_token: { Args: { _token: string }; Returns: Json }
      get_team_rsvp_by_token: { Args: { _token: string }; Returns: Json }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach_verified: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_member: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      is_parent_of_camp: { Args: { _camp_id: string }; Returns: boolean }
      is_team_coach: { Args: { _team_id: string }; Returns: boolean }
      is_team_member_visible_to_parent: {
        Args: { _team_member_id: string }
        Returns: boolean
      }
      is_team_parent: { Args: { _team_id: string }; Returns: boolean }
      my_team_membership: {
        Args: never
        Returns: {
          owner_id: string
          permission_level: Database["public"]["Enums"]["team_permission"]
          team_member_id: string
        }[]
      }
      respond_to_rsvp: {
        Args: { _reason?: string; _status: string; _token: string }
        Returns: Json
      }
      respond_to_team_rsvp: {
        Args: { _note?: string; _response: string; _token: string }
        Returns: Json
      }
      seed_dev_account: {
        Args: { p_tier: string; p_user_id: string }
        Returns: undefined
      }
      submit_team_invite: {
        Args: {
          _athlete_dob: string
          _parent_name: string
          _parent_phone: string
          _submission: Json
          _token: string
        }
        Returns: Json
      }
    }
    Enums: {
      accounting_provider: "quickbooks" | "xero"
      app_role: "admin" | "user"
      camp_format: "camp" | "session"
      camp_status: "draft" | "live" | "ended"
      camp_update_media_type: "photo" | "video"
      camp_update_post_type: "daily" | "wrap"
      combine_category:
        | "speed_power"
        | "jumping_explosiveness"
        | "shot_power"
        | "shot_speed"
        | "agility_circuits"
        | "recovery_wellness"
      conversation_type: "camp_group" | "dm"
      device_provider: "apple_health" | "whoop" | "garmin"
      difficulty_level: "beginner" | "intermediate" | "advanced" | "elite"
      dryland_category: "stick_skills" | "shooting" | "strength_explosiveness"
      dryland_difficulty: "beginner" | "intermediate" | "advanced"
      dryland_position: "player" | "goalie" | "both"
      dryland_program_season: "fall_winter" | "spring" | "summer" | "year_round"
      dryland_program_status: "coming_soon" | "active"
      dryland_video_category:
        | "stickhandling"
        | "shooting"
        | "strength_fitness"
        | "synthetic_ice"
        | "mobility_flexibility"
      email_campaign_status: "draft" | "scheduled" | "sent"
      email_marketing_provider: "mailchimp" | "klaviyo"
      enrollment_role: "parent" | "coach"
      enrollment_status: "active" | "paused" | "completed"
      game_media_label:
        | "highlight"
        | "full_game"
        | "period_1"
        | "period_2"
        | "period_3"
        | "warmup"
        | "other"
      game_media_type: "photo" | "video"
      location_type: "venue" | "online" | "tba"
      media_annotation_status: "raw" | "reviewed" | "annotated"
      order_status: "pending" | "paid" | "refunded" | "failed"
      payment_plan: "none" | "two" | "three"
      practice_item_type: "session" | "drill" | "note"
      recommendation_status: "pending" | "accepted" | "dismissed"
      registration_status:
        | "paid"
        | "abandoned"
        | "waitlisted"
        | "refunded"
        | "pending"
      subscription_status_enum:
        | "free"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
      team_attendance_status: "present" | "absent" | "late"
      team_event_type: "game" | "practice" | "team_event"
      team_home_away: "home" | "away" | "neutral"
      team_invite_status: "pending" | "joined" | "resent"
      team_member_status: "active" | "invited"
      team_permission:
        | "owner"
        | "coach"
        | "assistant"
        | "manager"
        | "content_creator"
      team_rsvp_response: "yes" | "no" | "maybe"
      waitlist_status:
        | "waiting"
        | "offered"
        | "claimed"
        | "expired"
        | "released"
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
    Enums: {
      accounting_provider: ["quickbooks", "xero"],
      app_role: ["admin", "user"],
      camp_format: ["camp", "session"],
      camp_status: ["draft", "live", "ended"],
      camp_update_media_type: ["photo", "video"],
      camp_update_post_type: ["daily", "wrap"],
      combine_category: [
        "speed_power",
        "jumping_explosiveness",
        "shot_power",
        "shot_speed",
        "agility_circuits",
        "recovery_wellness",
      ],
      conversation_type: ["camp_group", "dm"],
      device_provider: ["apple_health", "whoop", "garmin"],
      difficulty_level: ["beginner", "intermediate", "advanced", "elite"],
      dryland_category: ["stick_skills", "shooting", "strength_explosiveness"],
      dryland_difficulty: ["beginner", "intermediate", "advanced"],
      dryland_position: ["player", "goalie", "both"],
      dryland_program_season: ["fall_winter", "spring", "summer", "year_round"],
      dryland_program_status: ["coming_soon", "active"],
      dryland_video_category: [
        "stickhandling",
        "shooting",
        "strength_fitness",
        "synthetic_ice",
        "mobility_flexibility",
      ],
      email_campaign_status: ["draft", "scheduled", "sent"],
      email_marketing_provider: ["mailchimp", "klaviyo"],
      enrollment_role: ["parent", "coach"],
      enrollment_status: ["active", "paused", "completed"],
      game_media_label: [
        "highlight",
        "full_game",
        "period_1",
        "period_2",
        "period_3",
        "warmup",
        "other",
      ],
      game_media_type: ["photo", "video"],
      location_type: ["venue", "online", "tba"],
      media_annotation_status: ["raw", "reviewed", "annotated"],
      order_status: ["pending", "paid", "refunded", "failed"],
      payment_plan: ["none", "two", "three"],
      practice_item_type: ["session", "drill", "note"],
      recommendation_status: ["pending", "accepted", "dismissed"],
      registration_status: [
        "paid",
        "abandoned",
        "waitlisted",
        "refunded",
        "pending",
      ],
      subscription_status_enum: [
        "free",
        "trialing",
        "active",
        "past_due",
        "canceled",
      ],
      team_attendance_status: ["present", "absent", "late"],
      team_event_type: ["game", "practice", "team_event"],
      team_home_away: ["home", "away", "neutral"],
      team_invite_status: ["pending", "joined", "resent"],
      team_member_status: ["active", "invited"],
      team_permission: [
        "owner",
        "coach",
        "assistant",
        "manager",
        "content_creator",
      ],
      team_rsvp_response: ["yes", "no", "maybe"],
      waitlist_status: ["waiting", "offered", "claimed", "expired", "released"],
    },
  },
} as const
