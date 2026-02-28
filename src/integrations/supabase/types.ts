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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      circular_impact: {
        Row: {
          circular_id: string
          compliance_action: string | null
          created_at: string
          due_date: string | null
          entity_type: string | null
          id: string
          immediate_action: boolean | null
          impact_summary: string | null
          industry_type: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
        }
        Insert: {
          circular_id: string
          compliance_action?: string | null
          created_at?: string
          due_date?: string | null
          entity_type?: string | null
          id?: string
          immediate_action?: boolean | null
          impact_summary?: string | null
          industry_type?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
        }
        Update: {
          circular_id?: string
          compliance_action?: string | null
          created_at?: string
          due_date?: string | null
          entity_type?: string | null
          id?: string
          immediate_action?: boolean | null
          impact_summary?: string | null
          industry_type?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "circular_impact_circular_id_fkey"
            columns: ["circular_id"]
            isOneToOne: false
            referencedRelation: "circulars"
            referencedColumns: ["id"]
          },
        ]
      }
      circulars: {
        Row: {
          compliance_required: boolean | null
          created_at: string
          effective_date: string | null
          id: string
          published_date: string | null
          raw_text: string | null
          source: string
          status: Database["public"]["Enums"]["circular_status"]
          summary: string | null
          title: string
          url: string
        }
        Insert: {
          compliance_required?: boolean | null
          created_at?: string
          effective_date?: string | null
          id?: string
          published_date?: string | null
          raw_text?: string | null
          source: string
          status?: Database["public"]["Enums"]["circular_status"]
          summary?: string | null
          title: string
          url: string
        }
        Update: {
          compliance_required?: boolean | null
          created_at?: string
          effective_date?: string | null
          id?: string
          published_date?: string | null
          raw_text?: string | null
          source?: string
          status?: Database["public"]["Enums"]["circular_status"]
          summary?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          client_name: string
          created_at: string
          entity_type: string | null
          firm_id: string
          gst_registered: boolean | null
          has_foreign_investment: boolean | null
          id: string
          industry_type: string | null
          turnover: string | null
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          entity_type?: string | null
          firm_id: string
          gst_registered?: boolean | null
          has_foreign_investment?: boolean | null
          id?: string
          industry_type?: string | null
          turnover?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          entity_type?: string | null
          firm_id?: string
          gst_registered?: boolean | null
          has_foreign_investment?: boolean | null
          id?: string
          industry_type?: string | null
          turnover?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_tasks: {
        Row: {
          circular_id: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          firm_id: string
          id: string
          reminder_sent: boolean | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          status: Database["public"]["Enums"]["task_status"]
          task_title: string
          updated_at: string
        }
        Insert: {
          circular_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          firm_id: string
          id?: string
          reminder_sent?: boolean | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["task_status"]
          task_title: string
          updated_at?: string
        }
        Update: {
          circular_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          reminder_sent?: boolean | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["task_status"]
          task_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_tasks_circular_id_fkey"
            columns: ["circular_id"]
            isOneToOne: false
            referencedRelation: "circulars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          firm_name: string
          id: string
          subscription_plan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_name: string
          id?: string
          subscription_plan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_name?: string
          id?: string
          subscription_plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          firm_id: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          firm_id?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          firm_id?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_logs: {
        Row: {
          created_at: string
          id: string
          items_found: number
          message: string | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_found?: number
          message?: string | null
          source: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          items_found?: number
          message?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_user_firm_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_firm_admin: {
        Args: { _firm_id: string; _user_id: string }
        Returns: boolean
      }
      is_firm_member: {
        Args: { _firm_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "team_member"
      circular_status: "scraped" | "processing" | "processed" | "failed"
      risk_level: "low" | "medium" | "high"
      task_status: "pending" | "completed" | "overdue"
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
      app_role: ["admin", "team_member"],
      circular_status: ["scraped", "processing", "processed", "failed"],
      risk_level: ["low", "medium", "high"],
      task_status: ["pending", "completed", "overdue"],
    },
  },
} as const
