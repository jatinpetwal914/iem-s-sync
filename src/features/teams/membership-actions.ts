"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession } from "@/features/auth/get-current-user";
import type { MembershipActionState } from "@/features/teams/membership-action-state";
import { asMembershipStatus, asUserRole } from "@/features/teams/labels";
import {
  canDecideJoinRequest,
  canRemoveApprovedMember,
} from "@/types/permissions";
import {
  playboxRoute,
  routes,
  teamMembersRoute,
  teamRoute,
} from "@/config/routes";
import type { MembershipStatus } from "@/types/session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorState(message: string): MembershipActionState {
  return { status: "error", message };
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function approveMembership(
  _previous: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  return decideMembership(formData, "approved", "Member approved and connected.");
}

export async function rejectMembership(
  _previous: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  return decideMembership(formData, "rejected", "Join request rejected.");
}

export async function removeMembership(
  _previous: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  return decideMembership(formData, "removed", "Member removed. Access ended immediately.");
}

async function decideMembership(
  formData: FormData,
  nextStatus: Extract<MembershipStatus, "approved" | "rejected" | "removed">,
  successMessage: string,
): Promise<MembershipActionState> {
  const teamId = String(formData.get("teamId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");

  if (!isUuid(teamId) || !isUuid(membershipId)) {
    return errorState("Membership is required.");
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
    const { data: actorRow, error: actorError } = await supabase
      .from("team_members")
      .select("role, status")
      .eq("team_id", teamId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (actorError) {
      return errorState("Could not verify your role on this team.");
    }

    const actorRole = actorRow ? asUserRole(actorRow.role) : null;
    const actorStatus = actorRow ? asMembershipStatus(actorRow.status) : null;

    if (!actorRole || !actorStatus) {
      return errorState("Only owners and admins can manage membership.");
    }

    const { data: target, error: targetError } = await supabase
      .from("team_members")
      .select("id, role, status, user_id")
      .eq("id", membershipId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (targetError) {
      return errorState("Could not load that membership.");
    }

    if (!target) {
      return errorState("That membership is not available.");
    }

    const targetRole = asUserRole(target.role);
    const targetStatus = asMembershipStatus(target.status);

    if (!targetRole || !targetStatus) {
      return errorState("That membership is not available.");
    }

    if (target.user_id === session.user.id) {
      return errorState("You cannot change your own membership status.");
    }

    if (nextStatus === "removed") {
      if (!canRemoveApprovedMember(actorRole, actorStatus, targetRole, targetStatus)) {
        return errorState("Only owners and admins can remove approved members.");
      }
    } else if (!canDecideJoinRequest(actorRole, actorStatus, targetStatus)) {
      return errorState("Only owners and admins can review join requests.");
    }

    const expectedCurrent: MembershipStatus =
      nextStatus === "removed" ? "approved" : "pending";

    const { data, error } = await supabase
      .from("team_members")
      .update({ status: nextStatus })
      .eq("id", membershipId)
      .eq("team_id", teamId)
      .eq("status", expectedCurrent)
      .select("id")
      .maybeSingle();

    if (error) {
      return errorState(error.message);
    }

    if (!data) {
      return errorState(missingUpdateMessage(nextStatus));
    }
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "Could not update membership.",
    );
  }

  revalidateMembershipPaths(teamId);
  return { status: "success", message: successMessage };
}

function missingUpdateMessage(
  nextStatus: MembershipStatus,
): string {
  if (nextStatus === "removed") {
    return "That member could not be removed.";
  }
  if (nextStatus === "approved") {
    return "That join request could not be approved.";
  }
  return "That join request could not be rejected.";
}

function revalidateMembershipPaths(teamId: string) {
  revalidatePath(routes.dashboard);
  revalidatePath(routes.team);
  revalidatePath(routes.playbox);
  revalidatePath(teamRoute(teamId));
  revalidatePath(teamMembersRoute(teamId));
  revalidatePath(playboxRoute(teamId));
}
