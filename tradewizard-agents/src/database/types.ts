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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_signals: {
        Row: {
          agent_name: string
          agent_type: string
          confidence: number | null
          created_at: string | null
          direction: string
          fair_probability: number | null
          id: string
          key_drivers: Json | null
          market_id: string | null
          metadata: Json | null
          recommendation_id: string | null
        }
        Insert: {
          agent_name: string
          agent_type: string
          confidence?: number | null
          created_at?: string | null
          direction: string
          fair_probability?: number | null
          id?: string
          key_drivers?: Json | null
          market_id?: string | null
          metadata?: Json | null
          recommendation_id?: string | null
        }
        Update: {
          agent_name?: string
          agent_type?: string
          confidence?: number | null
          created_at?: string | null
          direction?: string
          fair_probability?: number | null
          id?: string
          key_drivers?: Json | null
          market_id?: string | null
          metadata?: Json | null
          recommendation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_signals_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_signals_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_history: {
        Row: {
          agents_used: Json | null
          analysis_type: string
          cost_usd: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          market_id: string | null
          status: string
        }
        Insert: {
          agents_used?: Json | null
          analysis_type: string
          cost_usd?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          market_id?: string | null
          status: string
        }
        Update: {
          agents_used?: Json | null
          analysis_type?: string
          cost_usd?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          market_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_history_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      langgraph_checkpoints: {
        Row: {
          checkpoint: Json
          checkpoint_id: string
          created_at: string | null
          metadata: Json | null
          parent_checkpoint_id: string | null
          thread_id: string
        }
        Insert: {
          checkpoint: Json
          checkpoint_id: string
          created_at?: string | null
          metadata?: Json | null
          parent_checkpoint_id?: string | null
          thread_id: string
        }
        Update: {
          checkpoint?: Json
          checkpoint_id?: string
          created_at?: string | null
          metadata?: Json | null
          parent_checkpoint_id?: string | null
          thread_id?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          condition_id: string
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          last_analyzed_at: string | null
          liquidity: number | null
          market_probability: number | null
          question: string
          resolved_outcome: string | null
          status: string
          trending_score: number | null
          updated_at: string | null
          volume_24h: number | null
        }
        Insert: {
          condition_id: string
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          last_analyzed_at?: string | null
          liquidity?: number | null
          market_probability?: number | null
          question: string
          resolved_outcome?: string | null
          status?: string
          trending_score?: number | null
          updated_at?: string | null
          volume_24h?: number | null
        }
        Update: {
          condition_id?: string
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          last_analyzed_at?: string | null
          liquidity?: number | null
          market_probability?: number | null
          question?: string
          resolved_outcome?: string | null
          status?: string
          trending_score?: number | null
          updated_at?: string | null
          volume_24h?: number | null
        }
        Relationships: []
      }
      migration_lock: {
        Row: {
          id: number
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
        }
        Insert: {
          id?: number
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
        }
        Update: {
          id?: number
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          catalysts: Json | null
          confidence: string
          created_at: string | null
          direction: string
          entry_zone_max: number | null
          entry_zone_min: number | null
          expected_value: number | null
          explanation: string | null
          fair_probability: number | null
          id: string
          market_edge: number | null
          market_id: string | null
          risks: Json | null
          target_zone_max: number | null
          target_zone_min: number | null
          updated_at: string | null
        }
        Insert: {
          catalysts?: Json | null
          confidence: string
          created_at?: string | null
          direction: string
          entry_zone_max?: number | null
          entry_zone_min?: number | null
          expected_value?: number | null
          explanation?: string | null
          fair_probability?: number | null
          id?: string
          market_edge?: number | null
          market_id?: string | null
          risks?: Json | null
          target_zone_max?: number | null
          target_zone_min?: number | null
          updated_at?: string | null
        }
        Update: {
          catalysts?: Json | null
          confidence?: string
          created_at?: string | null
          direction?: string
          entry_zone_max?: number | null
          entry_zone_min?: number | null
          expected_value?: number | null
          explanation?: string | null
          fair_probability?: number | null
          id?: string
          market_edge?: number | null
          market_id?: string | null
          risks?: Json | null
          target_zone_max?: number | null
          target_zone_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string | null
          checksum: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: number
          name: string
          success: boolean
          version: string
        }
        Insert: {
          applied_at?: string | null
          checksum?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: number
          name: string
          success?: boolean
          version: string
        }
        Update: {
          applied_at?: string | null
          checksum?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: number
          name?: string
          success?: boolean
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_migration_lock: { Args: { locker: string }; Returns: boolean }
      is_migration_applied: {
        Args: { migration_version: string }
        Returns: boolean
      }
      release_migration_lock: { Args: never; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
