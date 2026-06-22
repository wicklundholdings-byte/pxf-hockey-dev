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
      camps: {
        Row: {
          absent_alert: boolean
          absent_alert_minutes: number
          address: string | null
          capacity: number
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
          price_cents: number
          reminder_1day: boolean
          reminder_7day: boolean
          reminder_morning: boolean
          show_remaining: boolean
          sibling_discount: boolean
          sibling_discount_percent: number
          slug: string
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
          capacity?: number
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
          price_cents?: number
          reminder_1day?: boolean
          reminder_7day?: boolean
          reminder_morning?: boolean
          show_remaining?: boolean
          sibling_discount?: boolean
          sibling_discount_percent?: number
          slug: string
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
          capacity?: number
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
          price_cents?: number
          reminder_1day?: boolean
          reminder_7day?: boolean
          reminder_morning?: boolean
          show_remaining?: boolean
          sibling_discount?: boolean
          sibling_discount_percent?: number
          slug?: string
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
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          sms_provider: string
          sms_sender_name: string | null
          sms_sender_phone: string | null
          sms_signature: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          sms_provider?: string
          sms_sender_name?: string | null
          sms_sender_phone?: string | null
          sms_signature?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
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
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          member_user_id: string | null
          owner_id: string
          phone: string | null
          status: Database["public"]["Enums"]["team_member_status"]
          title: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          member_user_id?: string | null
          owner_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          title?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          member_user_id?: string | null
          owner_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          title?: string
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
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_contact_ids: { Args: never; Returns: string[] }
      get_rsvp_by_token: { Args: { _token: string }; Returns: Json }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      respond_to_rsvp: {
        Args: { _reason?: string; _status: string; _token: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      camp_format: "camp" | "session"
      camp_status: "draft" | "live" | "ended"
      conversation_type: "camp_group" | "dm"
      difficulty_level: "beginner" | "intermediate" | "advanced" | "elite"
      email_campaign_status: "draft" | "scheduled" | "sent"
      location_type: "venue" | "online" | "tba"
      order_status: "pending" | "paid" | "refunded" | "failed"
      payment_plan: "none" | "two" | "three"
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
      team_member_status: "active" | "invited"
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
      app_role: ["admin", "user"],
      camp_format: ["camp", "session"],
      camp_status: ["draft", "live", "ended"],
      conversation_type: ["camp_group", "dm"],
      difficulty_level: ["beginner", "intermediate", "advanced", "elite"],
      email_campaign_status: ["draft", "scheduled", "sent"],
      location_type: ["venue", "online", "tba"],
      order_status: ["pending", "paid", "refunded", "failed"],
      payment_plan: ["none", "two", "three"],
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
      team_member_status: ["active", "invited"],
      waitlist_status: ["waiting", "offered", "claimed", "expired", "released"],
    },
  },
} as const
