export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      markets: {
        Row: {
          id: string
          condition_id: string
          question: string
          description: string | null
          event_type: string
          market_probability: number | null
          volume_24h: number | null
          liquidity: number | null
          status: string
          resolved_outcome: string | null
          created_at: string
          updated_at: string
          last_analyzed_at: string | null
          trending_score: number | null
        }
        Insert: {
          id?: string
          condition_id: string
          question: string
          description?: string | null
          event_type: string
          market_probability?: number | null
          volume_24h?: number | null
          liquidity?: number | null
          status?: string
          resolved_outcome?: string | null
          created_at?: string
          updated_at?: string
          last_analyzed_at?: string | null
          trending_score?: number | null
        }
        Update: {
          id?: string
          condition_id?: string
          question?: string
          description?: string | null
          event_type?: string
          market_probability?: number | null
          volume_24h?: number | null
          liquidity?: number | null
          status?: string
          resolved_outcome?: string | null
          created_at?: string
          updated_at?: string
          last_analyzed_at?: string | null
          trending_score?: number | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          id: string
          market_id: string
          direction: string
          fair_probability: number | null
          market_edge: number | null
          expected_value: number | null
          confidence: string
          entry_zone_min: number | null
          entry_zone_max: number | null
          target_zone_min: number | null
          target_zone_max: number | null
          explanation: string | null
          catalysts: Json | null
          risks: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          market_id: string
          direction: string
          fair_probability?: number | null
          market_edge?: number | null
          expected_value?: number | null
          confidence: string
          entry_zone_min?: number | null
          entry_zone_max?: number | null
          target_zone_min?: number | null
          target_zone_max?: number | null
          explanation?: string | null
          catalysts?: Json | null
          risks?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          direction?: string
          fair_probability?: number | null
          market_edge?: number | null
          expected_value?: number | null
          confidence?: string
          entry_zone_min?: number | null
          entry_zone_max?: number | null
          target_zone_min?: number | null
          target_zone_max?: number | null
          explanation?: string | null
          catalysts?: Json | null
          risks?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_signals: {
        Row: {
          id: string
          market_id: string
          recommendation_id: string | null
          agent_name: string
          agent_type: string
          fair_probability: number | null
          confidence: number | null
          direction: string
          key_drivers: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          market_id: string
          recommendation_id?: string | null
          agent_name: string
          agent_type: string
          fair_probability?: number | null
          confidence?: number | null
          direction: string
          key_drivers?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          recommendation_id?: string | null
          agent_name?: string
          agent_type?: string
          fair_probability?: number | null
          confidence?: number | null
          direction?: string
          key_drivers?: Json | null
          metadata?: Json | null
          created_at?: string
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
          }
        ]
      }
      analysis_history: {
        Row: {
          id: string
          market_id: string
          analysis_type: string
          status: string
          duration_ms: number | null
          cost_usd: number | null
          agents_used: Json | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          market_id: string
          analysis_type: string
          status: string
          duration_ms?: number | null
          cost_usd?: number | null
          agents_used?: Json | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          analysis_type?: string
          status?: string
          duration_ms?: number | null
          cost_usd?: number | null
          agents_used?: Json | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_history_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          }
        ]
      }
      langgraph_checkpoints: {
        Row: {
          thread_id: string
          checkpoint_id: string
          parent_checkpoint_id: string | null
          checkpoint: Json
          metadata: Json | null
          created_at: string
        }
        Insert: {
          thread_id: string
          checkpoint_id: string
          parent_checkpoint_id?: string | null
          checkpoint: Json
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          thread_id?: string
          checkpoint_id?: string
          parent_checkpoint_id?: string | null
          checkpoint?: Json
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}