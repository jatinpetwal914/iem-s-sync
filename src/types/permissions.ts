import type { UserRole } from "@/types/roles";
import type { MembershipStatus } from "@/types/session";

export type Capability =
  | "controlMasterSession"
  | "approveMembers"
  | "removeMembers"
  | "createInvites"
  | "modifyTeamSettings";

const roleCapabilities: Record<UserRole, readonly Capability[]> = {
  OWNER: [
    "controlMasterSession",
    "approveMembers",
    "removeMembers",
    "createInvites",
    "modifyTeamSettings",
  ],
  ADMIN: [
    "controlMasterSession",
    "approveMembers",
    "removeMembers",
    "createInvites",
  ],
  MEMBER: [],
};

export function hasCapability(role: UserRole, capability: Capability): boolean {
  return roleCapabilities[role].includes(capability);
}

export function canControlMasterSession(role: UserRole): boolean {
  return hasCapability(role, "controlMasterSession");
}

export function canControlTeamSession(
  role: UserRole,
  status: MembershipStatus,
): boolean {
  return isApprovedMembership(status) && canControlMasterSession(role);
}

export function canManageMembers(role: UserRole): boolean {
  return (
    hasCapability(role, "approveMembers") ||
    hasCapability(role, "removeMembers")
  );
}

export function canModifyTeamSettings(role: UserRole): boolean {
  return hasCapability(role, "modifyTeamSettings");
}

export function canViewTeamRoster(
  role: UserRole,
  status: MembershipStatus,
): boolean {
  return role === "OWNER" || status === "approved";
}

export function canEditTeamName(
  role: UserRole,
  status: MembershipStatus,
): boolean {
  return status === "approved" && canModifyTeamSettings(role);
}

export function canCreateInvites(
  role: UserRole,
  status: MembershipStatus,
): boolean {
  return status === "approved" && hasCapability(role, "createInvites");
}

export function isApprovedMembership(status: MembershipStatus): boolean {
  return status === "approved";
}

export function canAccessPlayBox(status: MembershipStatus): boolean {
  return isApprovedMembership(status);
}

export function canReviewJoinRequests(
  role: UserRole,
  status: MembershipStatus,
): boolean {
  return isApprovedMembership(status) && hasCapability(role, "approveMembers");
}

export function canDecideJoinRequest(
  actorRole: UserRole,
  actorStatus: MembershipStatus,
  targetStatus: MembershipStatus,
): boolean {
  return canReviewJoinRequests(actorRole, actorStatus) && targetStatus === "pending";
}

export function canRemoveApprovedMember(
  actorRole: UserRole,
  actorStatus: MembershipStatus,
  targetRole: UserRole,
  targetStatus: MembershipStatus,
): boolean {
  return (
    isApprovedMembership(actorStatus) &&
    hasCapability(actorRole, "removeMembers") &&
    targetRole !== "OWNER" &&
    targetStatus === "approved"
  );
}
