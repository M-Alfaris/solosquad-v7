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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          channel_type: string
          chat_id: string
          id: string
          messages: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          user_role: Database["public"]["Enums"]["user_role_type"] | null
        }
        Insert: {
          channel_type?: string
          chat_id: string
          id?: string
          messages?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role_type"] | null
        }
        Update: {
          channel_type?: string
          chat_id?: string
          id?: string
          messages?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role_type"] | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          platform: string
          post_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          source_channel: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id: string
          parent_comment_id?: string | null
          platform?: string
          post_id: string
          role?: Database["public"]["Enums"]["user_role_type"]
          source_channel?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          platform?: string
          post_id?: string
          role?: Database["public"]["Enums"]["user_role_type"]
          source_channel?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_comments_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_logs: {
        Row: {
          created_at: string | null
          id: string
          job_name: string
          message: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_name: string
          message?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_name?: string
          message?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      detected_intents: {
        Row: {
          confidence: Json
          created_at: string
          id: string
          input_id: string
          intents: Json
          user_id: string | null
        }
        Insert: {
          confidence?: Json
          created_at?: string
          id?: string
          input_id: string
          intents?: Json
          user_id?: string | null
        }
        Update: {
          confidence?: Json
          created_at?: string
          id?: string
          input_id?: string
          intents?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          error_message: string
          error_type: string
          id: number
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_message: string
          error_type: string
          id?: never
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_message?: string
          error_type?: string
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          category: string | null
          connection_status: string | null
          created_at: string
          fb_page_id: string
          fb_page_token: string
          id: string
          ig_access_token: string | null
          ig_account_id: string | null
          is_active: boolean
          name: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          connection_status?: string | null
          created_at?: string
          fb_page_id: string
          fb_page_token: string
          id?: string
          ig_access_token?: string | null
          ig_account_id?: string | null
          is_active?: boolean
          name: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          connection_status?: string | null
          created_at?: string
          fb_page_id?: string
          fb_page_token?: string
          id?: string
          ig_access_token?: string | null
          ig_account_id?: string | null
          is_active?: boolean
          name?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pages_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_profiles: {
        Row: {
          agent_overrides: Json
          base_instructions: string | null
          business_info: Json
          created_at: string
          id: string
          personal_info: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_overrides?: Json
          base_instructions?: string | null
          business_info?: Json
          created_at?: string
          id?: string
          personal_info?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_overrides?: Json
          base_instructions?: string | null
          business_info?: Json
          created_at?: string
          id?: string
          personal_info?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_persona_profiles_user_id"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          media_analysis: Json
          media_url: string | null
          platform: string
          social_user_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id: string
          media_analysis?: Json
          media_url?: string | null
          platform?: string
          social_user_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_analysis?: Json
          media_url?: string | null
          platform?: string
          social_user_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_posts_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          category: Database["public"]["Enums"]["user_category"] | null
          created_at: string
          display_name: string | null
          email: string | null
          fb_access_token: string | null
          fb_uid: string | null
          fb_user_id: string | null
          full_name: string | null
          id: string
          ig_uid: string | null
          is_active: boolean | null
          stripe_customer_id: string | null
          subscription_status: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_access_token: string | null
        }
        Insert: {
          avatar_url?: string | null
          category?: Database["public"]["Enums"]["user_category"] | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          fb_access_token?: string | null
          fb_uid?: string | null
          fb_user_id?: string | null
          full_name?: string | null
          id: string
          ig_uid?: string | null
          is_active?: boolean | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_access_token?: string | null
        }
        Update: {
          avatar_url?: string | null
          category?: Database["public"]["Enums"]["user_category"] | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          fb_access_token?: string | null
          fb_uid?: string | null
          fb_user_id?: string | null
          full_name?: string | null
          id?: string
          ig_uid?: string | null
          is_active?: boolean | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_access_token?: string | null
        }
        Relationships: []
      }
      prompt_configurations: {
        Row: {
          business_name: string
          created_at: string
          custom_tools: Json
          details: string
          file_references: Json
          file_search_enabled: boolean
          id: string
          is_active: boolean
          keywords: string[]
          nlp_custom_instructions: string | null
          nlp_intents: string[]
          system_instructions: string
          time_api_enabled: boolean
          trigger_mode: string
          updated_at: string
          user_id: string | null
          weather_api_enabled: boolean
          web_search_enabled: boolean
        }
        Insert: {
          business_name?: string
          created_at?: string
          custom_tools?: Json
          details?: string
          file_references?: Json
          file_search_enabled?: boolean
          id?: string
          is_active?: boolean
          keywords?: string[]
          nlp_custom_instructions?: string | null
          nlp_intents?: string[]
          system_instructions?: string
          time_api_enabled?: boolean
          trigger_mode?: string
          updated_at?: string
          user_id?: string | null
          weather_api_enabled?: boolean
          web_search_enabled?: boolean
        }
        Update: {
          business_name?: string
          created_at?: string
          custom_tools?: Json
          details?: string
          file_references?: Json
          file_search_enabled?: boolean
          id?: string
          is_active?: boolean
          keywords?: string[]
          nlp_custom_instructions?: string | null
          nlp_intents?: string[]
          system_instructions?: string
          time_api_enabled?: boolean
          trigger_mode?: string
          updated_at?: string
          user_id?: string | null
          weather_api_enabled?: boolean
          web_search_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_prompt_configurations_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_status: {
        Row: {
          created_at: string
          id: string
          last_sync_time: string
          posts_processed: number | null
          sync_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_time: string
          posts_processed?: number | null
          sync_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_time?: string
          posts_processed?: number | null
          sync_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_conversations: {
        Row: {
          content: string
          context: Json | null
          conversation_id: string
          created_at: string
          first_interaction: string | null
          id: string
          interaction_count: number | null
          last_interaction: string | null
          message_type: string
          post_id: string | null
          preferences: Json | null
          tools_used: string[] | null
          updated_at: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          content: string
          context?: Json | null
          conversation_id: string
          created_at?: string
          first_interaction?: string | null
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          message_type: string
          post_id?: string | null
          preferences?: Json | null
          tools_used?: string[] | null
          updated_at?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          content?: string
          context?: Json | null
          conversation_id?: string
          created_at?: string
          first_interaction?: string | null
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          message_type?: string
          post_id?: string | null
          preferences?: Json | null
          tools_used?: string[] | null
          updated_at?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_token: {
        Args: { encrypted_token: string; key: string }
        Returns: string
      }
      encrypt_token: {
        Args: { key: string; token: string }
        Returns: string
      }
      user_can_access_post: {
        Args: { post_id: string }
        Returns: boolean
      }
      user_owns_posts: {
        Args: { post_ids: string[] }
        Returns: {
          id: string
        }[]
      }
      user_owns_social_content: {
        Args: { p_fb_uid?: string; p_ig_uid?: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_category: "Business" | "Content Creator" | "Other"
      user_role_type: "follower" | "ai_agent" | "admin"
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
      user_category: ["Business", "Content Creator", "Other"],
      user_role_type: ["follower", "ai_agent", "admin"],
    },
  },
} as const
