import type { UserRole } from "@/types/roles";
import type { MembershipStatus, SyncQuality } from "@/types/session";

export type TeamWorkspace = {
  teamId: string;
  teamName: string;
  role: UserRole;
  membershipStatus: MembershipStatus;
  memberCount: number | null;
  connectionStatus: SyncQuality;
};

export type TeamMemberRow = {
  membershipId: string;
  userId: string;
  displayName: string | null;
  email: string | null;
  requestedAt: string;
  role: UserRole;
  status: MembershipStatus;
};

export type TeamDetail = {
  workspace: TeamWorkspace;
  members: TeamMemberRow[];
};
