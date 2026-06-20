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
          present: boolean
          registration_id: string
          session_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          present?: boolean
          registration_id: string
          session_id: string
        }
        Update: {
          id?: string
          marked_at?: string
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
      camps: {
        Row: {
          address: string | null
          capacity: number
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
          show_remaining: boolean
          sibling_discount: boolean
          slug: string
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["camp_status"]
          tags: string[]
          timezone: string
          updated_at: string
          venue_name: string | null
          waiver_url: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number
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
          show_remaining?: boolean
          sibling_discount?: boolean
          slug: string
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["camp_status"]
          tags?: string[]
          timezone?: string
          updated_at?: string
          venue_name?: string | null
          waiver_url?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number
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
          show_remaining?: boolean
          sibling_discount?: boolean
          slug?: string
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["camp_status"]
          tags?: string[]
          timezone?: string
          updated_at?: string
          venue_name?: string | null
          waiver_url?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          joined_at: string
          notes: string | null
          owner_id: string
          phone: string | null
          subscribed: boolean
          tags: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          joined_at?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          subscribed?: boolean
          tags?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          joined_at?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
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
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id?: string
          percent_off?: number | null
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
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
          full_description: string | null
          id: string
          is_premium: boolean
          is_published: boolean
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
          full_description?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
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
          full_description?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          subscription_status: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          subscription_status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
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
          camp_id: string
          contact_id: string | null
          created_at: string
          custom_field_values: Json
          id: string
          order_number: string
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          attendee_id?: string | null
          camp_id: string
          contact_id?: string | null
          created_at?: string
          custom_field_values?: Json
          id?: string
          order_number?: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          attendee_id?: string | null
          camp_id?: string
          contact_id?: string | null
          created_at?: string
          custom_field_values?: Json
          id?: string
          order_number?: string
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
          position: number
          status: Database["public"]["Enums"]["waitlist_status"]
        }
        Insert: {
          attendee_id?: string | null
          camp_id: string
          claim_expires_at?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          position?: number
          status?: Database["public"]["Enums"]["waitlist_status"]
        }
        Update: {
          attendee_id?: string | null
          camp_id?: string
          claim_expires_at?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          position?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
