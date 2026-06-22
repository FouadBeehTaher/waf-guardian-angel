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
      blocked_ips: {
        Row: {
          blocked_until: string | null
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      requests_log: {
        Row: {
          allowed: boolean
          category: Database["public"]["Enums"]["attack_category"] | null
          created_at: string
          id: string
          ip: string
          matched_rule_id: string | null
          matched_rule_name: string | null
          matched_rules: Json | null
          method: string
          path: string
          payload: string | null
          reason: string | null
          severity: Database["public"]["Enums"]["attack_severity"] | null
          threat_score: number
          user_agent: string | null
        }
        Insert: {
          allowed: boolean
          category?: Database["public"]["Enums"]["attack_category"] | null
          created_at?: string
          id?: string
          ip: string
          matched_rule_id?: string | null
          matched_rule_name?: string | null
          matched_rules?: Json | null
          method: string
          path: string
          payload?: string | null
          reason?: string | null
          severity?: Database["public"]["Enums"]["attack_severity"] | null
          threat_score?: number
          user_agent?: string | null
        }
        Update: {
          allowed?: boolean
          category?: Database["public"]["Enums"]["attack_category"] | null
          created_at?: string
          id?: string
          ip?: string
          matched_rule_id?: string | null
          matched_rule_name?: string | null
          matched_rules?: Json | null
          method?: string
          path?: string
          payload?: string | null
          reason?: string | null
          severity?: Database["public"]["Enums"]["attack_severity"] | null
          threat_score?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_log_matched_rule_id_fkey"
            columns: ["matched_rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          category: Database["public"]["Enums"]["attack_category"]
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          is_builtin: boolean
          name: string
          pattern: string
          severity: Database["public"]["Enums"]["attack_severity"]
          updated_at: string
          weight: number
        }
        Insert: {
          category: Database["public"]["Enums"]["attack_category"]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          is_builtin?: boolean
          name: string
          pattern: string
          severity?: Database["public"]["Enums"]["attack_severity"]
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["attack_category"]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          is_builtin?: boolean
          name?: string
          pattern?: string
          severity?: Database["public"]["Enums"]["attack_severity"]
          updated_at?: string
          weight?: number
        }
        Relationships: []
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
      waf_settings: {
        Row: {
          auto_block_threshold: number
          enabled: boolean
          id: number
          rate_limit_per_min: number
          updated_at: string
        }
        Insert: {
          auto_block_threshold?: number
          enabled?: boolean
          id?: number
          rate_limit_per_min?: number
          updated_at?: string
        }
        Update: {
          auto_block_threshold?: number
          enabled?: boolean
          id?: number
          rate_limit_per_min?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_stats: {
        Args: never
        Returns: {
          active_rules: number
          total_blocked: number
          total_requests: number
        }[]
      }
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
      attack_category:
        | "sqli"
        | "xss"
        | "path_traversal"
        | "command_injection"
        | "lfi"
        | "rfi"
        | "rate_limit"
        | "ip_block"
        | "other"
        | "ssti"
        | "xxe"
        | "dom_xss"
        | "ssi"
        | "file_upload"
        | "file_inclusion"
      attack_severity: "low" | "medium" | "high" | "critical"
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
      attack_category: [
        "sqli",
        "xss",
        "path_traversal",
        "command_injection",
        "lfi",
        "rfi",
        "rate_limit",
        "ip_block",
        "other",
        "ssti",
        "xxe",
        "dom_xss",
        "ssi",
        "file_upload",
        "file_inclusion",
      ],
      attack_severity: ["low", "medium", "high", "critical"],
    },
  },
} as const
