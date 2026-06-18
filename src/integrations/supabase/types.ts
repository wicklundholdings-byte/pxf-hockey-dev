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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      difficulty_level: "beginner" | "intermediate" | "advanced" | "elite"
      subscription_status_enum:
        | "free"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
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
      difficulty_level: ["beginner", "intermediate", "advanced", "elite"],
      subscription_status_enum: [
        "free",
        "trialing",
        "active",
        "past_due",
        "canceled",
      ],
    },
  },
} as const
