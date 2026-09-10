import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { playboxRoute, teamMembersRoute, teamRoute, beatControlRoute } from "@/config/routes";
import {
  connectionStatusLabel,
  membershipStatusLabel,
  roleLabel,
} from "@/features/teams/labels";
import type { TeamWorkspace } from "@/features/teams/types";
import { canAccessPlayBox, canControlTeamSession, canViewTeamRoster } from "@/types/permissions";

type TeamSummaryCardProps = {
  workspace: TeamWorkspace;
};

export function TeamSummaryCard({ workspace }: TeamSummaryCardProps) {
  const canSeeMembers = canViewTeamRoster(
    workspace.role,
    workspace.membershipStatus,
  );
  const canOpenPlayBox = canAccessPlayBox(workspace.membershipStatus);
  const canOpenBeatControl = canControlTeamSession(
    workspace.role,
    workspace.membershipStatus,
  );

  return (
    <Panel>
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
        WORKSPACE
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Stat label="My Team" value={workspace.teamName} />
        <Stat
          label="My Role"
          value={
            workspace.membershipStatus === "approved"
              ? roleLabel(workspace.role)
              : `${roleLabel(workspace.role)} · ${membershipStatusLabel(workspace.membershipStatus)}`
          }
        />
        <Stat
          label="Member Count"
          value={
            workspace.memberCount === null
              ? "Hidden until approved"
              : String(workspace.memberCount)
          }
        />
        <Stat
          label="Connection Status"
          value={connectionStatusLabel(workspace.connectionStatus)}
        />
      </dl>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={teamRoute(workspace.teamId)} variant="ghost">
          Manage team
        </ButtonLink>
        {canSeeMembers ? (
          <ButtonLink href={teamMembersRoute(workspace.teamId)} variant="ghost">
            View members
          </ButtonLink>
        ) : null}
        {canOpenBeatControl ? (
          <ButtonLink href={beatControlRoute(workspace.teamId)} variant="accent">
            Beat Control
          </ButtonLink>
        ) : null}
        {canOpenPlayBox ? (
          <ButtonLink href={playboxRoute(workspace.teamId)}>PlayBox</ButtonLink>
        ) : (
          <p className="self-center text-sm text-muted">
            {workspace.membershipStatus === "pending"
              ? "PlayBox unlocks after approval."
              : "PlayBox access is not available."}
          </p>
        )}
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.22em] text-muted">
        {label}
      </dt>
      <dd className="mt-2 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </dd>
    </div>
  );
}
