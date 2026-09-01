export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          auth_user_id: string;
          created_at: string;
          display_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["admin_role"];
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          business_id: string;
          created_at: string;
          event_type: Database["public"]["Enums"]["analytics_event_type"];
          id: string;
          metadata: Json;
          session_id: string | null;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          event_type: Database["public"]["Enums"]["analytics_event_type"];
          id?: string;
          metadata?: Json;
          session_id?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          event_type?: Database["public"]["Enums"]["analytics_event_type"];
          id?: string;
          metadata?: Json;
          session_id?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          admin_user_id: string;
          business_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json;
        };
        Insert: {
          action: string;
          admin_user_id: string;
          business_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json;
        };
        Update: {
          action?: string;
          admin_user_id?: string;
          business_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string | null;
          google_review_url: string;
          id: string;
          logo_path: string | null;
          name: string;
          primary_color: string | null;
          slug: string;
          status: Database["public"]["Enums"]["business_status"];
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          google_review_url: string;
          id?: string;
          logo_path?: string | null;
          name: string;
          primary_color?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["business_status"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          google_review_url?: string;
          id?: string;
          logo_path?: string | null;
          name?: string;
          primary_color?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["business_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      review_generations: {
        Row: {
          business_id: string;
          created_at: string;
          error_code: string | null;
          generated_text: string | null;
          generation_number: number;
          id: string;
          input_hash: string | null;
          language: Database["public"]["Enums"]["generation_language"];
          model: string | null;
          prompt_version: string;
          provider: string;
          session_id: string;
          status: Database["public"]["Enums"]["review_generation_status"];
        };
        Insert: {
          business_id: string;
          created_at?: string;
          error_code?: string | null;
          generated_text?: string | null;
          generation_number: number;
          id?: string;
          input_hash?: string | null;
          language: Database["public"]["Enums"]["generation_language"];
          model?: string | null;
          prompt_version?: string;
          provider: string;
          session_id: string;
          status?: Database["public"]["Enums"]["review_generation_status"];
        };
        Update: {
          business_id?: string;
          created_at?: string;
          error_code?: string | null;
          generated_text?: string | null;
          generation_number?: number;
          id?: string;
          input_hash?: string | null;
          language?: Database["public"]["Enums"]["generation_language"];
          model?: string | null;
          prompt_version?: string;
          provider?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["review_generation_status"];
        };
        Relationships: [];
      };
      review_question_options: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          label: string;
          question_id: string;
          sort_order: number;
          updated_at: string;
          value: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label: string;
          question_id: string;
          sort_order?: number;
          updated_at?: string;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          question_id?: string;
          sort_order?: number;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      review_questions: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          question: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          question: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          question?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_sessions: {
        Row: {
          anonymous_session_id: string;
          answers: Json;
          business_id: string;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          generation_language: Database["public"]["Enums"]["generation_language"];
          id: string;
          regeneration_count: number;
          started_at: string;
          updated_at: string;
        };
        Insert: {
          anonymous_session_id?: string;
          answers?: Json;
          business_id: string;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          generation_language?: Database["public"]["Enums"]["generation_language"];
          id?: string;
          regeneration_count?: number;
          started_at?: string;
          updated_at?: string;
        };
        Update: {
          anonymous_session_id?: string;
          answers?: Json;
          business_id?: string;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          generation_language?: Database["public"]["Enums"]["generation_language"];
          id?: string;
          regeneration_count?: number;
          started_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          business_id: string;
          cancelled_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          is_current: boolean;
          notes: string | null;
          plan: string;
          starts_at: string;
          status: Database["public"]["Enums"]["subscription_status"];
          suspended_at: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          cancelled_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          is_current?: boolean;
          notes?: string | null;
          plan: string;
          starts_at: string;
          status: Database["public"]["Enums"]["subscription_status"];
          suspended_at?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          cancelled_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          is_current?: boolean;
          notes?: string | null;
          plan?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          suspended_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      admin_role: "ADMIN";
      analytics_event_type:
        | "PAGE_VIEW"
        | "REVIEW_STARTED"
        | "REVIEW_GENERATED"
        | "REVIEW_REGENERATED"
        | "REVIEW_EDITED"
        | "GOOGLE_REVIEW_CLICK";
      business_status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
      generation_language: "en" | "ne";
      review_generation_status: "SUCCEEDED" | "FAILED";
      subscription_status:
        | "TRIAL"
        | "ACTIVE"
        | "EXPIRED"
        | "SUSPENDED"
        | "CANCELLED";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Row"];

export type TablesInsert<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Insert"];

export type TablesUpdate<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Update"];
