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
      business_deletion_cleanup: {
        Row: { business_id: string; business_name: string; slug: string; objects: Json; created_at: string };
        Insert: { business_id: string; business_name: string; slug: string; objects: Json; created_at?: string };
        Update: { objects?: Json };
        Relationships: [];
      };
      business_payment_qrs: {
        Row: { id: string; business_id: string; name: string; image_path: string; sort_order: number; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; business_id: string; name: string; image_path: string; sort_order: number; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; business_id?: string; name?: string; image_path?: string; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "business_payment_qrs_business_id_fkey"; columns: ["business_id"]; isOneToOne: false; referencedRelation: "businesses"; referencedColumns: ["id"] }];
      };
      legacy_payment_destinations: {
        Row: { link_id: string; business_id: string; provider: string; destination: string; archived_at: string };
        Insert: { link_id: string; business_id: string; provider: string; destination: string; archived_at?: string };
        Update: { link_id?: string; business_id?: string; provider?: string; destination?: string; archived_at?: string };
        Relationships: [{ foreignKeyName: "legacy_payment_destinations_business_id_fkey"; columns: ["business_id"]; isOneToOne: false; referencedRelation: "businesses"; referencedColumns: ["id"] }];
      };
      business_smart_links: {
        Row: { id: string; business_id: string; type: import("@/features/smart-links/config").SmartLinkType; label: string; url: string | null; image_path: string | null; sort_order: number; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; business_id: string; type: import("@/features/smart-links/config").SmartLinkType; label?: string; url?: string | null; image_path?: string | null; sort_order: number; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; business_id?: string; type?: import("@/features/smart-links/config").SmartLinkType; label?: string; url?: string | null; image_path?: string | null; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "business_smart_links_business_id_fkey"; columns: ["business_id"]; isOneToOne: false; referencedRelation: "businesses"; referencedColumns: ["id"] }];
      };
      smart_link_events: {
        Row: { id: string; business_id: string; event_type: "SMART_PAGE_VIEW" | "SMART_LINK_CLICK" | "PAYMENT_QR_VIEW" | "PAYMENT_PAGE_VIEW"; payment_method_id: string | null; link_type: import("@/features/smart-links/config").SmartLinkType | null; created_at: string };
        Insert: { id?: string; business_id: string; event_type: "SMART_PAGE_VIEW" | "SMART_LINK_CLICK" | "PAYMENT_QR_VIEW" | "PAYMENT_PAGE_VIEW"; payment_method_id?: string | null; link_type?: import("@/features/smart-links/config").SmartLinkType | null; created_at?: string };
        Update: { id?: string; business_id?: string; event_type?: "SMART_PAGE_VIEW" | "SMART_LINK_CLICK" | "PAYMENT_QR_VIEW" | "PAYMENT_PAGE_VIEW"; payment_method_id?: string | null; link_type?: import("@/features/smart-links/config").SmartLinkType | null; created_at?: string };
        Relationships: [{ foreignKeyName: "smart_link_events_business_id_fkey"; columns: ["business_id"]; isOneToOne: false; referencedRelation: "businesses"; referencedColumns: ["id"] }];
      };
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
          dedupe_key: string | null;
          event_type: Database["public"]["Enums"]["analytics_event_type"];
          id: string;
          metadata: Json;
          session_id: string | null;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          dedupe_key?: string | null;
          event_type: Database["public"]["Enums"]["analytics_event_type"];
          id?: string;
          metadata?: Json;
          session_id?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          dedupe_key?: string | null;
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
          qr_logo_path: string | null;
          use_business_logo_for_qr: boolean;
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
          qr_logo_path?: string | null;
          use_business_logo_for_qr?: boolean;
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
          qr_logo_path?: string | null;
          use_business_logo_for_qr?: boolean;
          name?: string;
          primary_color?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["business_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limit_counters: {
        Row: {
          key_hash: string;
          request_count: number;
          scope: string;
          updated_at: string;
          window_started_at: string;
        };
        Insert: {
          key_hash: string;
          request_count?: number;
          scope: string;
          updated_at?: string;
          window_started_at?: string;
        };
        Update: {
          key_hash?: string;
          request_count?: number;
          scope?: string;
          updated_at?: string;
          window_started_at?: string;
        };
        Relationships: [];
      };
      review_generations: {
        Row: {
          attempt_count: number;
          business_id: string;
          created_at: string;
          error_code: string | null;
          final_text: string | null;
          finalized_at: string | null;
          generated_text: string | null;
          generation_number: number;
          id: string;
          input_hash: string | null;
          language: Database["public"]["Enums"]["generation_language"];
          last_attempted_at: string;
          model: string | null;
          prompt_version: string;
          provider: string;
          session_id: string;
          status: Database["public"]["Enums"]["review_generation_status"];
        };
        Insert: {
          attempt_count?: number;
          business_id: string;
          created_at?: string;
          error_code?: string | null;
          final_text?: string | null;
          finalized_at?: string | null;
          generated_text?: string | null;
          generation_number: number;
          id?: string;
          input_hash?: string | null;
          language: Database["public"]["Enums"]["generation_language"];
          last_attempted_at?: string;
          model?: string | null;
          prompt_version?: string;
          provider: string;
          session_id: string;
          status?: Database["public"]["Enums"]["review_generation_status"];
        };
        Update: {
          attempt_count?: number;
          business_id?: string;
          created_at?: string;
          error_code?: string | null;
          final_text?: string | null;
          finalized_at?: string | null;
          generated_text?: string | null;
          generation_number?: number;
          id?: string;
          input_hash?: string | null;
          language?: Database["public"]["Enums"]["generation_language"];
          last_attempted_at?: string;
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
          archived_at: string | null;
          business_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          question: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          business_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          question: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
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
      delete_business_permanently: { Args: { p_business_id: string }; Returns: Json };
      complete_business_deletion: { Args: { p_business_id: string }; Returns: undefined };
      apply_payment_qr_action: {
        Args: { p_business_id: string; p_action: string; p_payment_id: string; p_name?: string; p_image_path?: string; p_is_active?: boolean; p_direction?: string };
        Returns: string;
      };
      apply_smart_link_action: {
        Args: { p_business_id: string; p_action: string; p_link_id?: string; p_type?: string; p_label?: string; p_url?: string; p_image_path?: string; p_is_active?: boolean; p_direction?: string };
        Returns: string;
      };
      apply_review_option_action: {
        Args: {
          p_action: string;
          p_business_id: string;
          p_direction?: string | null;
          p_is_active?: boolean | null;
          p_label?: string | null;
          p_option_id?: string | null;
          p_question_id: string;
          p_value?: string | null;
        };
        Returns: string;
      };
      apply_review_question_action: {
        Args: {
          p_action: string;
          p_business_id: string;
          p_direction?: string | null;
          p_is_active?: boolean | null;
          p_question?: string | null;
          p_question_id?: string | null;
        };
        Returns: string;
      };
      apply_subscription_action: {
        Args: {
          p_action: string;
          p_business_id: string;
          p_custom_expires_at?: string | null;
          p_months?: number | null;
        };
        Returns: string;
      };
      consume_rate_limit: {
        Args: {
          p_key_hash: string;
          p_limit: number;
          p_scope: string;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      finish_review_generation: {
        Args: {
          p_error_code?: string | null;
          p_generated_text?: string | null;
          p_generation_id: string;
          p_status: Database["public"]["Enums"]["review_generation_status"];
        };
        Returns: undefined;
      };
      get_business_analytics: {
        Args: { p_business_id: string; p_from: string; p_to: string };
        Returns: Json;
      };
      get_platform_analytics: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      get_subscription_alerts: {
        Args: { p_bucket: string };
        Returns: Array<{ business_id: string; business_name: string; expires_at: string; status: Database["public"]["Enums"]["subscription_status"] }>;
      };
      get_subscription_alerts_page: {
        Args: { p_bucket: string; p_page: number; p_page_size: number };
        Returns: Json;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      reserve_review_generation: {
        Args: {
          p_business_id: string;
          p_input_hash: string;
          p_language: Database["public"]["Enums"]["generation_language"];
          p_model: string;
          p_prompt_version: string;
          p_provider: string;
          p_session_id: string;
        };
        Returns: Array<{ generation_id: string; generation_number: number }>;
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
      review_generation_status: "PENDING" | "SUCCEEDED" | "FAILED";
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
