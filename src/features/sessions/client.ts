import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { mapBeatSessionRow, type MasterSession } from "@/lib/sessions/map-session";

export type TypedSupabase = SupabaseClient<Database>;

export type SessionCommand =
  | "play"
  | "pause"
  | "resume"
  | "stop"
  | "reset"
  | "configure";

export type SessionControlInput = {
  teamId: string;
  command: SessionCommand;
  bpm?: number | null;
  genreId?: string | null;
  timeSignature?: string | null;
  beatPattern?: string | null;
  sampleRate?: number | null;
};

export async function fetchBeatSession(
  supabase: TypedSupabase,
  teamId: string,
): Promise<MasterSession | null> {
  const { data, error } = await supabase
    .from("beat_sessions")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the master session.");
  }
  if (!data) {
    return null;
  }
  return mapBeatSessionRow(data);
}

export async function ensureBeatSession(
  supabase: TypedSupabase,
  teamId: string,
): Promise<MasterSession> {
  const { data, error } = await supabase.rpc("ensure_beat_session", {
    p_team_id: teamId,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create the master session.");
  }
  return mapBeatSessionRow(data);
}

export async function controlBeatSession(
  supabase: TypedSupabase,
  input: SessionControlInput,
): Promise<MasterSession> {
  const { data, error } = await supabase.rpc("control_beat_session", {
    p_team_id: input.teamId,
    p_command: input.command,
    p_bpm: input.bpm ?? null,
    p_genre_id: input.genreId ?? null,
    p_time_signature: input.timeSignature ?? null,
    p_beat_pattern: input.beatPattern ?? null,
    p_sample_rate: input.sampleRate ?? null,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Session command failed.");
  }
  return mapBeatSessionRow(data);
}

export async function configurePerformance(
  supabase: TypedSupabase,
  input: {
    teamId: string;
    countInBars?: number | null;
    songId?: string | null;
    setlistId?: string | null;
  },
): Promise<MasterSession> {
  const { data, error } = await supabase.rpc("configure_performance", {
    p_team_id: input.teamId,
    p_count_in_bars: input.countInBars ?? null,
    p_song_id: input.songId ?? null,
    p_setlist_id: input.setlistId ?? null,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Could not update the performance.");
  }
  return mapBeatSessionRow(data);
}

export async function configureMonitorAudio(
  supabase: TypedSupabase,
  input: { teamId: string; enabled: boolean },
): Promise<MasterSession> {
  const { data, error } = await supabase.rpc("configure_monitor_audio", {
    p_team_id: input.teamId,
    p_enabled: input.enabled,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Could not update monitor audio.");
  }
  return mapBeatSessionRow(data);
}

export async function fetchServerEpochMs(supabase: TypedSupabase): Promise<number> {
  const { data, error } = await supabase.rpc("server_time");
  if (error || !data) {
    throw new Error("Could not read server time.");
  }
  const parsed = Date.parse(String(data));
  if (Number.isNaN(parsed)) {
    throw new Error("Server time was invalid.");
  }
  return parsed;
}
