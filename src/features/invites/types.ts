import type { InviteStatus, MembershipStatus } from "@/types/session";
import type { UserRole } from "@/types/roles";

export type ActiveInvite = {
  id: string;
  teamId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  status: InviteStatus;
};

export type RedeemOutcome =
  | "unauthenticated"
  | "invalid"
  | "expired"
  | "revoked"
  | "already_member"
  | "requested";

export type RedeemResult = {
  outcome: RedeemOutcome;
  teamId: string | null;
  teamName: string | null;
  membershipStatus: MembershipStatus | null;
  role: UserRole | null;
};
