import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { getTeamDetail } from "@/features/teams/queries";
import { RenameTeamForm } from "@/features/teams/rename-team-form";
import { MembersTable } from "@/features/teams/members-table";
import { TeamSummaryCard } from "@/features/teams/team-summary-card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { canCreateInvites, canEditTeamName, canReviewJoinRequests, canViewTeamRoster } from "@/types/permissions";
import { InviteManagementPanel } from "@/features/invites/invite-management-panel";
import { JoinRequestsPanel } from "@/features/teams/join-requests-panel";
import { routes, teamMembersRoute } from "@/config/routes";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
};

export const metadata: Metadata = {
  title: "Team",
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const session = await getAuthSession();

  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }

  if (session.status === "error") {
    return (
      <ErrorState title="Could not verify session" message={session.message} />
    );
  }

  const detail = await getTeamDetail(teamId, session.user.id);
  if (!detail.ok) {
    if (detail.notFound) {
      return (
        <EmptyState
          eyebrow="UNAUTHORIZED"
          title="Team not available"
          message="You do not have access to this workspace."
          actionHref={routes.dashboard}
          actionLabel="Back to dashboard"
        />
      );
    }

    return <ErrorState title="Could not load team" message={detail.message} />;
  }

  const { workspace, members } = detail.detail;
  const canRename = canEditTeamName(workspace.role, workspace.membershipStatus);
  const canSeeMembers = canViewTeamRoster(
    workspace.role,
    workspace.membershipStatus,
  );
  const canInvite = canCreateInvites(
    workspace.role,
    workspace.membershipStatus,
  );
  const canReview = canReviewJoinRequests(
    workspace.role,
    workspace.membershipStatus,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10 sm:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-accent">
        TEAM
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {workspace.teamName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Role-aware workspace. Owners and admins run Beat Control. Approved
            members follow on PlayBox.
          </p>
        </div>
        <ButtonLink href={routes.dashboard} variant="ghost">
          Dashboard
        </ButtonLink>
      </div>

      <TeamSummaryCard workspace={workspace} />

      {canRename ? (
        <Panel>
          <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
            OWNER SETTINGS
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Only the owner can change the team name.
          </p>
          <div className="mt-6">
            <RenameTeamForm
              teamId={workspace.teamId}
              currentName={workspace.teamName}
            />
          </div>
        </Panel>
      ) : null}

      {canInvite ? <InviteManagementPanel teamId={workspace.teamId} /> : null}
      {canReview ? <JoinRequestsPanel teamId={workspace.teamId} /> : null}

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
              MEMBERS
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Names, roles, and membership status for this workspace.
            </p>
          </div>
          {canSeeMembers ? (
            <ButtonLink href={teamMembersRoute(workspace.teamId)} variant="ghost">
              Member list
            </ButtonLink>
          ) : null}
        </div>
        <div className="mt-6">
          {canSeeMembers ? (
            <MembersTable
              teamId={workspace.teamId}
              members={members}
              currentUserId={session.user.id}
              actorRole={workspace.role}
              actorStatus={workspace.membershipStatus}
            />
          ) : (
            <p className="text-sm leading-6 text-muted">
              Member roster is visible after your membership is approved.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
