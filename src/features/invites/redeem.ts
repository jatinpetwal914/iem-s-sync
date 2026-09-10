import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseInviteToken } from "@/features/invites/token";
import type { RedeemResult } from "@/features/invites/types";
import { asMembershipStatus, asUserRole } from "@/features/teams/labels";

type RedeemPayload = {
  outcome?: string;
  team_id?: string;
  team_name?: string;
  membership_status?: string;
  role?: string;
};

export async function redeemInvite(rawToken: string): Promise<RedeemResult> {
  const parsed = parseInviteToken(rawToken);
  if (!parsed.ok) {
    return emptyResult("invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("redeem_team_invite", {
    raw_token: parsed.token,
  });

  if (error || !data) {
    return emptyResult("invalid");
  }

  const payload = data as RedeemPayload;
  const outcome = asOutcome(payload.outcome);

  return {
    outcome,
    teamId: payload.team_id ?? null,
    teamName: payload.team_name ?? null,
    membershipStatus: payload.membership_status
      ? asMembershipStatus(payload.membership_status)
      : null,
    role: payload.role ? asUserRole(payload.role) : null,
  };
}

function asOutcome(value: string | undefined): RedeemResult["outcome"] {
  switch (value) {
    case "unauthenticated":
    case "invalid":
    case "expired":
    case "revoked":
    case "already_member":
    case "requested":
      return value;
    default:
      return "invalid";
  }
}

function emptyResult(outcome: RedeemResult["outcome"]): RedeemResult {
  return {
    outcome,
    teamId: null,
    teamName: null,
    membershipStatus: null,
    role: null,
  };
}
