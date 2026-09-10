import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBeatSessionRow, type MasterSession } from "@/lib/sessions/map-session";

export async function getTeamBeatSession(
  teamId: string,
): Promise<
  { ok: true; session: MasterSession | null } | { ok: false; message: string }
> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("beat_sessions")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Could not load the master session." };
  }

  return { ok: true, session: data ? mapBeatSessionRow(data) : null };
}

export async function ensureTeamBeatSession(
  teamId: string,
): Promise<{ ok: true; session: MasterSession } | { ok: false; message: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("ensure_beat_session", {
    p_team_id: teamId,
  });

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "Could not create the master session.",
    };
  }

  return { ok: true, session: mapBeatSessionRow(data) };
}
