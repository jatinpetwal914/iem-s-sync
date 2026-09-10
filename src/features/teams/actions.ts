"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession } from "@/features/auth/get-current-user";
import { parseTeamName } from "@/features/teams/team-name";
import type { TeamActionState } from "@/features/teams/team-action-state";
import { canEditTeamName } from "@/types/permissions";
import { asMembershipStatus, asUserRole } from "@/features/teams/labels";
import { routes, teamMembersRoute, teamRoute } from "@/config/routes";

function invalidState(issues: string[]): TeamActionState {
  return { status: "error", issues, message: null };
}

function errorState(message: string): TeamActionState {
  return { status: "error", issues: [], message };
}

export async function createTeam(
  _previous: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const parsed = parseTeamName(String(formData.get("name") ?? ""));
  if (!parsed.ok) {
    return invalidState(parsed.issues);
  }

  const session = await getAuthSession();
  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (session.status === "error") {
    return errorState(session.message);
  }

  let teamId: string;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: parsed.value.name,
        owner_id: session.user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      return errorState(error?.message ?? "Could not create the team.");
    }

    teamId = data.id;
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "Could not create the team.",
    );
  }

  revalidateTeamPaths(teamId);
  redirect(teamRoute(teamId));
}

export async function updateTeamName(
  _previous: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) {
    return errorState("Team is required.");
  }

  const parsed = parseTeamName(String(formData.get("name") ?? ""));
  if (!parsed.ok) {
    return invalidState(parsed.issues);
  }

  const session = await getAuthSession();
  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (session.status === "error") {
    return errorState(session.message);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role, status")
      .eq("team_id", teamId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (membershipError) {
      return errorState("Could not verify your role on this team.");
    }

    const role = membership ? asUserRole(membership.role) : null;
    const status = membership ? asMembershipStatus(membership.status) : null;

    if (!role || !status || !canEditTeamName(role, status)) {
      return errorState("Only the team owner can edit the team name.");
    }

    const { data, error } = await supabase
      .from("teams")
      .update({ name: parsed.value.name })
      .eq("id", teamId)
      .select("id")
      .maybeSingle();

    if (error) {
      return errorState(error.message);
    }

    if (!data) {
      return errorState("Only the team owner can edit the team name.");
    }
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "Could not update the team name.",
    );
  }

  revalidateTeamPaths(teamId);
  redirect(teamRoute(teamId));
}

function revalidateTeamPaths(teamId: string) {
  revalidatePath(routes.dashboard);
  revalidatePath(routes.team);
  revalidatePath(teamRoute(teamId));
  revalidatePath(teamMembersRoute(teamId));
}
