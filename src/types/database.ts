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
      beat_sessions: {
        Row: {
          beat_pattern: string | null;
          bpm: number;
          created_at: string;
          created_by: string;
          genre_id: string | null;
          id: string;
          pause_at: string | null;
          position_beats: number;
          revision: number;
          sample_rate: number;
          start_at: string | null;
          status: Database["public"]["Enums"]["session_status"];
          team_id: string;
          time_signature: string;
          updated_at: string;
        };
        Insert: {
          beat_pattern?: string | null;
          bpm?: number;
          created_at?: string;
          created_by: string;
          genre_id?: string | null;
          id?: string;
          pause_at?: string | null;
          position_beats?: number;
          revision?: number;
          sample_rate?: number;
          start_at?: string | null;
          status?: Database["public"]["Enums"]["session_status"];
          team_id: string;
          time_signature?: string;
          updated_at?: string;
        };
        Update: {
          beat_pattern?: string | null;
          bpm?: number;
          created_at?: string;
          created_by?: string;
          genre_id?: string | null;
          id?: string;
          pause_at?: string | null;
          position_beats?: number;
          revision?: number;
          sample_rate?: number;
          start_at?: string | null;
          status?: Database["public"]["Enums"]["session_status"];
          team_id?: string;
          time_signature?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "beat_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "beat_sessions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      member_devices: {
        Row: {
          browser: string | null;
          clock_offset_ms: number | null;
          created_at: string;
          device_label: string | null;
          estimated_latency_ms: number | null;
          id: string;
          last_seen_at: string | null;
          platform: string | null;
          round_trip_ms: number | null;
          session_id: string | null;
          sync_status: Database["public"]["Enums"]["sync_status"];
          team_id: string | null;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          browser?: string | null;
          clock_offset_ms?: number | null;
          created_at?: string;
          device_label?: string | null;
          estimated_latency_ms?: number | null;
          id?: string;
          last_seen_at?: string | null;
          platform?: string | null;
          round_trip_ms?: number | null;
          session_id?: string | null;
          sync_status?: Database["public"]["Enums"]["sync_status"];
          team_id?: string | null;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          browser?: string | null;
          clock_offset_ms?: number | null;
          created_at?: string;
          device_label?: string | null;
          estimated_latency_ms?: number | null;
          id?: string;
          last_seen_at?: string | null;
          platform?: string | null;
          round_trip_ms?: number | null;
          session_id?: string | null;
          sync_status?: Database["public"]["Enums"]["sync_status"];
          team_id?: string | null;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_devices_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "beat_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_devices_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_devices_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_events: {
        Row: {
          actor_id: string;
          created_at: string;
          event_type: Database["public"]["Enums"]["event_type"];
          id: string;
          occurred_at: string;
          payload: Json;
          revision: number;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          event_type: Database["public"]["Enums"]["event_type"];
          id?: string;
          occurred_at?: string;
          payload?: Json;
          revision: number;
          session_id: string;
          updated_at?: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          event_type?: Database["public"]["Enums"]["event_type"];
          id?: string;
          occurred_at?: string;
          payload?: Json;
          revision?: number;
          session_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_events_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "beat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      session_members: {
        Row: {
          clock_offset_ms: number | null;
          created_at: string;
          estimated_latency_ms: number | null;
          id: string;
          last_sync_at: string | null;
          round_trip_ms: number | null;
          session_id: string;
          sync_status: Database["public"]["Enums"]["sync_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          clock_offset_ms?: number | null;
          created_at?: string;
          estimated_latency_ms?: number | null;
          id?: string;
          last_sync_at?: string | null;
          round_trip_ms?: number | null;
          session_id: string;
          sync_status?: Database["public"]["Enums"]["sync_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          clock_offset_ms?: number | null;
          created_at?: string;
          estimated_latency_ms?: number | null;
          id?: string;
          last_sync_at?: string | null;
          round_trip_ms?: number | null;
          session_id?: string;
          sync_status?: Database["public"]["Enums"]["sync_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_members_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "beat_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      team_invites: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          max_uses: number;
          revoked_at: string | null;
          status: Database["public"]["Enums"]["invite_status"];
          team_id: string;
          token_hash: string;
          updated_at: string;
          use_count: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at: string;
          id?: string;
          max_uses?: number;
          revoked_at?: string | null;
          status?: Database["public"]["Enums"]["invite_status"];
          team_id: string;
          token_hash: string;
          updated_at?: string;
          use_count?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          max_uses?: number;
          revoked_at?: string | null;
          status?: Database["public"]["Enums"]["invite_status"];
          team_id?: string;
          token_hash?: string;
          updated_at?: string;
          use_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "team_invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invites_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          created_at: string;
          id: string;
          requested_at: string;
          requested_email: string | null;
          role: Database["public"]["Enums"]["user_role"];
          status: Database["public"]["Enums"]["membership_status"];
          team_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          requested_at?: string;
          requested_email?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          team_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          requested_at?: string;
          requested_email?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          team_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      redeem_team_invite: {
        Args: { raw_token: string };
        Returns: Json;
      };
      server_time: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      ensure_beat_session: {
        Args: { p_team_id: string };
        Returns: Database["public"]["Tables"]["beat_sessions"]["Row"];
      };
      control_beat_session: {
        Args: {
          p_team_id: string;
          p_command: string;
          p_bpm?: number | null;
          p_genre_id?: string | null;
          p_time_signature?: string | null;
          p_beat_pattern?: string | null;
          p_sample_rate?: number | null;
          p_lead_ms?: number | null;
        };
        Returns: Database["public"]["Tables"]["beat_sessions"]["Row"];
      };
    };
    Enums: {
      event_type:
        | "play"
        | "pause"
        | "resume"
        | "stop"
        | "reset"
        | "bpm_change"
        | "pattern_change"
        | "signature_change"
        | "genre_change";
      invite_status: "active" | "expired" | "revoked" | "exhausted";
      membership_status: "pending" | "approved" | "rejected" | "removed";
      session_status: "stopped" | "playing" | "paused";
      sync_status: "EXCELLENT" | "GOOD" | "UNSTABLE" | "OFFLINE";
      user_role: "OWNER" | "ADMIN" | "MEMBER";
    };
    CompositeTypes: Record<string, never>;
  };
};
