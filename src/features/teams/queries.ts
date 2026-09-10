import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canViewTeamRoster } from "@/types/permissions";
import {
  asMembershipStatus,
  asSyncQuality,
  asUserRole,
} from "@/features/teams/labels";
import type {
  TeamDetail,
  TeamMemberRow,
  TeamWorkspace,
} from "@/features/teams/types";

type NestedRecord = Record<string, unknown> | Record<string, unknown>[] | null;

function firstNested<T extends Record<string, unknown>>(
  value: NestedRecord,
): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return (value[0] as T | undefined) ?? null;
  }

  return value as T;
}

export async function listMyWorkspaces(
  userId: string,
): Promise<{ ok: true; workspaces: TeamWorkspace[] } | { ok: false; message: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("role, status, team_id, created_at, teams ( id, name )")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, message: "Could not load your teams. Please try again." };
  }

  const rows = data ?? [];
  const teamIds = rows.map((row) => row.team_id);
  const memberCounts = await countApprovedMembers(teamIds);
  const connectionByTeam = await loadConnectionStatuses(userId, teamIds);

  const workspaces: TeamWorkspace[] = [];

  for (const row of rows) {
    const role = asUserRole(row.role);
    const status = asMembershipStatus(row.status);
    const team = firstNested<{ id: string; name: string }>(
      row.teams as NestedRecord,
    );

    if (!role || !status || !team) {
      continue;
    }

    workspaces.push({
      teamId: team.id,
      teamName: team.name,
      role,
      membershipStatus: status,
      memberCount: canViewTeamRoster(role, status)
        ? (memberCounts.get(team.id) ?? 0)
        : null,
      connectionStatus: connectionByTeam.get(team.id) ?? "OFFLINE",
    });
  }

  return { ok: true, workspaces };
}

export async function getTeamDetail(
  teamId: string,
  userId: string,
): Promise<
  { ok: true; detail: TeamDetail } | { ok: false; message: string; notFound?: boolean }
> {
  const workspacesResult = await listMyWorkspaces(userId);
  if (!workspacesResult.ok) {
    return workspacesResult;
  }

  const workspace = workspacesResult.workspaces.find(
    (item) => item.teamId === teamId,
  );

  if (!workspace) {
    return {
      ok: false,
      notFound: true,
      message: "This team is not available on your account.",
    };
  }

  if (!canViewTeamRoster(workspace.role, workspace.membershipStatus)) {
    return { ok: true, detail: { workspace, members: [] } };
  }

  const members = await listTeamMembers(teamId);
  if (!members.ok) {
    return members;
  }

  return { ok: true, detail: { workspace, members: members.members } };
}

export async function listJoinRequests(
  teamId: string,
): Promise<{ ok: true; requests: TeamMemberRow[] } | { ok: false; message: string }> {
  const members = await listTeamMembers(teamId);
  if (!members.ok) {
    return members;
  }

  return {
    ok: true,
    requests: members.members.filter((member) => member.status === "pending"),
  };
}

async function listTeamMembers(
  teamId: string,
): Promise<{ ok: true; members: TeamMemberRow[] } | { ok: false; message: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("team_members")
    .select(
      "id, role, status, user_id, requested_at, requested_email, profiles ( display_name )",
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, message: "Could not load team members. Please try again." };
  }

  const members: TeamMemberRow[] = [];

  for (const row of data ?? []) {
    const role = asUserRole(row.role);
    const status = asMembershipStatus(row.status);
    const profile = firstNested<{ display_name: string | null }>(
      row.profiles as NestedRecord,
    );

    if (!role || !status) {
      continue;
    }

    members.push({
      membershipId: row.id,
      userId: row.user_id,
      displayName: profile?.display_name ?? null,
      email: row.requested_email,
      requestedAt: row.requested_at,
      role,
      status,
    });
  }

  return { ok: true, members };
}

async function countApprovedMembers(teamIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (teamIds.length === 0) {
    return counts;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, status")
    .in("team_id", teamIds);

  if (error || !data) {
    return counts;
  }

  for (const row of data) {
    if (row.status !== "approved") {
      continue;
    }

    counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
  }

  return counts;
}

async function loadConnectionStatuses(
  userId: string,
  teamIds: string[],
): Promise<Map<string, ReturnType<typeof asSyncQuality>>> {
  const statuses = new Map<string, ReturnType<typeof asSyncQuality>>();
  if (teamIds.length === 0) {
    return statuses;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("member_devices")
    .select("team_id, sync_status, last_seen_at")
    .eq("user_id", userId)
    .in("team_id", teamIds)
    .order("last_seen_at", { ascending: false });

  if (error || !data) {
    return statuses;
  }

  for (const row of data) {
    if (!row.team_id || statuses.has(row.team_id)) {
      continue;
    }

    statuses.set(row.team_id, asSyncQuality(row.sync_status));
  }

  return statuses;
}
