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
          active_section_id: string | null;
          active_setlist_id: string | null;
          active_song_id: string | null;
          beat_pattern: string | null;
          bpm: number;
          count_in_bars: number;
          created_at: string;
          created_by: string;
          genre_id: string | null;
          id: string;
          monitor_audio_enabled: boolean;
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
          active_section_id?: string | null;
          active_setlist_id?: string | null;
          active_song_id?: string | null;
          beat_pattern?: string | null;
          bpm?: number;
          count_in_bars?: number;
          created_at?: string;
          created_by: string;
          genre_id?: string | null;
          id?: string;
          monitor_audio_enabled?: boolean;
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
          active_section_id?: string | null;
          active_setlist_id?: string | null;
          active_song_id?: string | null;
          beat_pattern?: string | null;
          bpm?: number;
          count_in_bars?: number;
          created_at?: string;
          created_by?: string;
          genre_id?: string | null;
          id?: string;
          monitor_audio_enabled?: boolean;
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
            foreignKeyName: "beat_sessions_active_section_id_fkey";
            columns: ["active_section_id"];
            isOneToOne: false;
            referencedRelation: "song_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "beat_sessions_active_setlist_id_fkey";
            columns: ["active_setlist_id"];
            isOneToOne: false;
            referencedRelation: "setlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "beat_sessions_active_song_id_fkey";
            columns: ["active_song_id"];
            isOneToOne: false;
            referencedRelation: "songs";
            referencedColumns: ["id"];
          },
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
          battery_charging: boolean | null;
          battery_percent: number | null;
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
          battery_charging?: boolean | null;
          battery_percent?: number | null;
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
          battery_charging?: boolean | null;
          battery_percent?: number | null;
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
      monitor_mixes: {
        Row: {
          created_at: string;
          id: string;
          locked: boolean;
          receiver_id: string;
          revision: number;
          sources: Json;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          locked?: boolean;
          receiver_id: string;
          revision?: number;
          sources?: Json;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          locked?: boolean;
          receiver_id?: string;
          revision?: number;
          sources?: Json;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monitor_mixes_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitor_mixes_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
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
      setlist_items: {
        Row: {
          created_at: string;
          id: string;
          setlist_id: string;
          song_id: string;
          sort_order: number;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          setlist_id: string;
          song_id: string;
          sort_order: number;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          setlist_id?: string;
          song_id?: string;
          sort_order?: number;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "setlist_items_setlist_id_fkey";
            columns: ["setlist_id"];
            isOneToOne: false;
            referencedRelation: "setlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "setlist_items_song_id_fkey";
            columns: ["song_id"];
            isOneToOne: false;
            referencedRelation: "songs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "setlist_items_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      setlists: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "setlists_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "setlists_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      song_recordings: {
        Row: {
          created_at: string;
          duration_ms: number;
          file_size: number;
          id: string;
          mime_type: string;
          performer_name: string | null;
          performer_role: Database["public"]["Enums"]["user_role"] | null;
          session_id: string | null;
          song_id: string;
          status: Database["public"]["Enums"]["recording_status"];
          storage_path: string;
          take_number: number;
          team_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_ms: number;
          file_size: number;
          id?: string;
          mime_type: string;
          performer_name?: string | null;
          performer_role?: Database["public"]["Enums"]["user_role"] | null;
          session_id?: string | null;
          song_id: string;
          status?: Database["public"]["Enums"]["recording_status"];
          storage_path: string;
          take_number?: number;
          team_id: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_ms?: number;
          file_size?: number;
          id?: string;
          mime_type?: string;
          performer_name?: string | null;
          performer_role?: Database["public"]["Enums"]["user_role"] | null;
          session_id?: string | null;
          song_id?: string;
          status?: Database["public"]["Enums"]["recording_status"];
          storage_path?: string;
          take_number?: number;
          team_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "song_recordings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "beat_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "song_recordings_song_id_fkey";
            columns: ["song_id"];
            isOneToOne: false;
            referencedRelation: "songs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "song_recordings_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "song_recordings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      song_sections: {
        Row: {
          bars: number | null;
          chords: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["song_section_kind"];
          lyric_cues: Json;
          lyrics: string | null;
          song_id: string;
          sort_order: number;
          start_bar: number;
          team_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          bars?: number | null;
          chords?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["song_section_kind"];
          lyric_cues?: Json;
          lyrics?: string | null;
          song_id: string;
          sort_order: number;
          start_bar?: number;
          team_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          bars?: number | null;
          chords?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["song_section_kind"];
          lyric_cues?: Json;
          lyrics?: string | null;
          song_id?: string;
          sort_order?: number;
          start_bar?: number;
          team_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "song_sections_song_id_fkey";
            columns: ["song_id"];
            isOneToOne: false;
            referencedRelation: "songs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "song_sections_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      songs: {
        Row: {
          backing_track_url: string | null;
          bpm: number | null;
          created_at: string;
          created_by: string;
          id: string;
          lyrics_auto_advance: boolean;
          lyrics_effect: Database["public"]["Enums"]["lyrics_effect"];
          lyrics_highlight: boolean;
          lyrics_speed: Database["public"]["Enums"]["lyrics_speed"];
          lyrics_transition: Database["public"]["Enums"]["lyrics_transition"];
          lyrics_upcoming_lines: number;
          musical_key: string | null;
          notes: string | null;
          team_id: string;
          time_signature: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          backing_track_url?: string | null;
          bpm?: number | null;
          created_at?: string;
          created_by: string;
          id?: string;
          lyrics_auto_advance?: boolean;
          lyrics_effect?: Database["public"]["Enums"]["lyrics_effect"];
          lyrics_highlight?: boolean;
          lyrics_speed?: Database["public"]["Enums"]["lyrics_speed"];
          lyrics_transition?: Database["public"]["Enums"]["lyrics_transition"];
          lyrics_upcoming_lines?: number;
          musical_key?: string | null;
          notes?: string | null;
          team_id: string;
          time_signature?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          backing_track_url?: string | null;
          bpm?: number | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          lyrics_auto_advance?: boolean;
          lyrics_effect?: Database["public"]["Enums"]["lyrics_effect"];
          lyrics_highlight?: boolean;
          lyrics_speed?: Database["public"]["Enums"]["lyrics_speed"];
          lyrics_transition?: Database["public"]["Enums"]["lyrics_transition"];
          lyrics_upcoming_lines?: number;
          musical_key?: string | null;
          notes?: string | null;
          team_id?: string;
          time_signature?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "songs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "songs_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
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
      configure_performance: {
        Args: {
          p_team_id: string;
          p_count_in_bars?: number | null;
          p_song_id?: string | null;
          p_setlist_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["beat_sessions"]["Row"];
      };
      configure_monitor_audio: {
        Args: {
          p_team_id: string;
          p_enabled: boolean;
        };
        Returns: Database["public"]["Tables"]["beat_sessions"]["Row"];
      };
      save_monitor_mix: {
        Args: {
          p_team_id: string;
          p_receiver_id: string;
          p_sources: Json;
          p_locked?: boolean;
        };
        Returns: Database["public"]["Tables"]["monitor_mixes"]["Row"];
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
        | "genre_change"
        | "song_change"
        | "count_in_change";
      invite_status: "active" | "expired" | "revoked" | "exhausted";
      lyrics_effect: "static" | "line" | "karaoke" | "progressive";
      lyrics_speed: "slow" | "normal" | "fast";
      lyrics_transition: "instant" | "smooth";
      membership_status: "pending" | "approved" | "rejected" | "removed";
      recording_status: "processing" | "ready" | "failed";
      session_status: "stopped" | "playing" | "paused";
      song_section_kind:
        | "intro"
        | "verse"
        | "pre_chorus"
        | "chorus"
        | "bridge"
        | "solo"
        | "outro"
        | "custom";
      sync_status: "EXCELLENT" | "GOOD" | "UNSTABLE" | "OFFLINE";
      user_role: "OWNER" | "ADMIN" | "MEMBER";
    };
    CompositeTypes: Record<string, never>;
  };
};
