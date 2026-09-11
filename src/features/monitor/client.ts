import type { Json } from "@/types/database";
import type { TypedSupabase } from "@/features/sessions/client";
import { parseSources } from "@/lib/monitor/mix";
import type { MonitorMixRecord, MonitorRosterMember, MonitorSources } from "@/lib/monitor/types";
import type { UserRole } from "@/types/roles";

export function mapMonitorMixRow(row: {
  id: string;
  team_id: string;
  receiver_id: string;
  sources: Json;
  locked: boolean;
  revision: number;
  updated_at: string;
}): MonitorMixRecord {
  return {
    id: row.id,
    teamId: row.team_id,
    receiverId: row.receiver_id,
    sources: parseSources(row.sources),
    locked: Boolean(row.locked),
    revision: Number(row.revision),
    updatedAt: row.updated_at,
  };
}

export async function fetchMonitorMixes(
  supabase: TypedSupabase,
  teamId: string,
): Promise<MonitorMixRecord[]> {
  const { data, error } = await supabase
    .from("monitor_mixes")
    .select("id, team_id, receiver_id, sources, locked, revision, updated_at")
    .eq("team_id", teamId);
  if (error) {
    throw new Error("Could not load monitor mixes.");
  }
  return (data ?? []).map(mapMonitorMixRow);
}

export async function saveMonitorMix(
  supabase: TypedSupabase,
  input: {
    teamId: string;
    receiverId: string;
    sources: MonitorSources;
    locked: boolean;
  },
): Promise<MonitorMixRecord> {
  const { data, error } = await supabase.rpc("save_monitor_mix", {
    p_team_id: input.teamId,
    p_receiver_id: input.receiverId,
    p_sources: input.sources as Json,
    p_locked: input.locked,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Could not save the monitor mix.");
  }
  return mapMonitorMixRow(data);
}

export async function fetchMonitorRoster(
  supabase: TypedSupabase,
  teamId: string,
): Promise<MonitorRosterMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("id, user_id, role, profiles ( display_name )")
    .eq("team_id", teamId)
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error("Could not load team members.");
  }
  const members: MonitorRosterMember[] = [];
  for (const row of data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    members.push({
      membershipId: row.id,
      userId: row.user_id,
      displayName: profile?.display_name?.trim() || "Member",
      role: (row.role as UserRole) ?? "MEMBER",
    });
  }
  return members;
}
