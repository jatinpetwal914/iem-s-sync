"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession } from "@/features/auth/get-current-user";
import { getRequestOrigin } from "@/features/auth/request-origin";
import {
  generateInviteToken,
  hashInviteToken,
  INVITE_MAX_USES,
  INVITE_TTL_MS,
} from "@/features/invites/token";
import type {
  CreateInviteState,
  RevokeInviteState,
} from "@/features/invites/invite-action-state";
import { canCreateInvites } from "@/types/permissions";
import { asMembershipStatus, asUserRole } from "@/features/teams/labels";
import { inviteRoute, routes, teamMembersRoute, teamRoute } from "@/config/routes";

function createError(message: string): CreateInviteState {
  return {
    status: "error",
    message,
    inviteUrl: null,
    expiresAt: null,
    maxUses: null,
  };
}

function revokeError(message: string): RevokeInviteState {
  return { status: "error", message };
}

export async function createInvite(
  _previous: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) {
    return createError("Team is required.");
  }

  const session = await getAuthSession();
  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (session.status === "error") {
    return createError(session.message);
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
      return createError("Could not verify your role on this team.");
    }

    const role = membership ? asUserRole(membership.role) : null;
    const status = membership ? asMembershipStatus(membership.status) : null;

    if (!role || !status || !canCreateInvites(role, status)) {
      return createError("Only owners and admins can create invitations.");
    }

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const { error } = await supabase.from("team_invites").insert({
      team_id: teamId,
      created_by: session.user.id,
      token_hash: hashInviteToken(token),
      expires_at: expiresAt,
      max_uses: INVITE_MAX_USES,
      status: "active",
    });

    if (error) {
      return createError(error.message);
    }

    const origin = await getRequestOrigin();
    revalidateInvitePaths(teamId);
    return {
      status: "created",
      message: "Invitation created. Copy or share the link now — it is not stored in plain text.",
      inviteUrl: `${origin}${inviteRoute(token)}`,
      expiresAt,
      maxUses: INVITE_MAX_USES,
    };
  } catch (error) {
    return createError(
      error instanceof Error ? error.message : "Could not create the invitation.",
    );
  }
}

export async function revokeInvite(
  _previous: RevokeInviteState,
  formData: FormData,
): Promise<RevokeInviteState> {
  const teamId = String(formData.get("teamId") ?? "");
  const inviteId = String(formData.get("inviteId") ?? "");
  if (!teamId || !inviteId) {
    return revokeError("Invitation is required.");
  }

  const session = await getAuthSession();
  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (session.status === "error") {
    return revokeError(session.message);
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
      return revokeError("Could not verify your role on this team.");
    }

    const role = membership ? asUserRole(membership.role) : null;
    const status = membership ? asMembershipStatus(membership.status) : null;

    if (!role || !status || !canCreateInvites(role, status)) {
      return revokeError("Only owners and admins can revoke invitations.");
    }

    const { data, error } = await supabase
      .from("team_invites")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("id", inviteId)
      .eq("team_id", teamId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (error) {
      return revokeError(error.message);
    }

    if (!data) {
      return revokeError("That invitation could not be revoked.");
    }
  } catch (error) {
    return revokeError(
      error instanceof Error ? error.message : "Could not revoke the invitation.",
    );
  }

  revalidateInvitePaths(teamId);
  return { status: "success", message: "Invitation revoked." };
}

function revalidateInvitePaths(teamId: string) {
  revalidatePath(routes.dashboard);
  revalidatePath(routes.team);
  revalidatePath(teamRoute(teamId));
  revalidatePath(teamMembersRoute(teamId));
}
