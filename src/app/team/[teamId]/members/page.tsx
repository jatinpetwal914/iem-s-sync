import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { getTeamDetail } from "@/features/teams/queries";
import { MembersTable } from "@/features/teams/members-table";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { canViewTeamRoster } from "@/types/permissions";
import { routes, teamRoute } from "@/config/routes";

type TeamMembersPageProps = {
  params: Promise<{ teamId: string }>;
};

export const metadata: Metadata = {
  title: "Team members",
};

export default async function TeamMembersPage({ params }: TeamMembersPageProps) {
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
          message="You do not have access to this member list."
          actionHref={routes.dashboard}
          actionLabel="Back to dashboard"
        />
      );
    }

    return (
      <ErrorState title="Could not load members" message={detail.message} />
    );
  }

  const { workspace, members } = detail.detail;
  const canSeeMembers = canViewTeamRoster(
    workspace.role,
    workspace.membershipStatus,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10 sm:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-sync">
        MEMBERS
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {workspace.teamName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Member roles and approval status. Pending requests appear on the
            team page.
          </p>
        </div>
        <ButtonLink href={teamRoute(workspace.teamId)} variant="ghost">
          Back to team
        </ButtonLink>
      </div>
      <Panel>
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
            You can see the roster after an owner or admin approves your
            membership.
          </p>
        )}
      </Panel>
    </div>
  );
}
