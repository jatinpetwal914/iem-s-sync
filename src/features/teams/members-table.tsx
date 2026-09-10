import { membershipStatusLabel, roleLabel } from "@/features/teams/labels";
import { RemoveMemberButton } from "@/features/teams/remove-member-button";
import { canRemoveApprovedMember } from "@/types/permissions";
import type { TeamMemberRow } from "@/features/teams/types";
import type { UserRole } from "@/types/roles";
import type { MembershipStatus } from "@/types/session";

type MembersTableProps = {
  teamId: string;
  members: TeamMemberRow[];
  currentUserId: string;
  actorRole: UserRole;
  actorStatus: MembershipStatus;
};

export function MembersTable({
  teamId,
  members,
  currentUserId,
  actorRole,
  actorStatus,
}: MembersTableProps) {
  const roster = members.filter((member) => member.status !== "pending");

  if (roster.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted">
        No members are visible for this team yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b border-white/8 text-muted">
            <th className="py-3 pr-4 font-mono text-[10px] font-medium tracking-[0.22em]">
              MEMBER
            </th>
            <th className="py-3 pr-4 font-mono text-[10px] font-medium tracking-[0.22em]">
              ROLE
            </th>
            <th className="py-3 pr-4 font-mono text-[10px] font-medium tracking-[0.22em]">
              STATUS
            </th>
            <th className="py-3 font-mono text-[10px] font-medium tracking-[0.22em]">
              ACCESS
            </th>
          </tr>
        </thead>
        <tbody>
          {roster.map((member) => (
            <tr key={member.membershipId} className="border-b border-white/6">
              <td className="py-3 pr-4 text-foreground">
                {memberLabel(member, currentUserId)}
              </td>
              <td className="py-3 pr-4 text-foreground">
                {roleLabel(member.role)}
              </td>
              <td className="py-3 pr-4 text-foreground">
                {membershipStatusLabel(member.status)}
              </td>
              <td className="py-3">
                {canRemoveApprovedMember(
                  actorRole,
                  actorStatus,
                  member.role,
                  member.status,
                ) ? (
                  <RemoveMemberButton
                    teamId={teamId}
                    membershipId={member.membershipId}
                  />
                ) : (
                  <span className="text-muted">
                    {member.status === "approved" ? "Connected" : "No access"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function memberLabel(member: TeamMemberRow, currentUserId: string): string {
  const base = member.displayName ?? member.email ?? `Member ${member.userId.slice(0, 8)}`;
  return member.userId === currentUserId ? `${base} (you)` : base;
}
