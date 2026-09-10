import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { LogoutButton } from "@/features/auth/logout-button";
import { listMyWorkspaces } from "@/features/teams/queries";
import { CreateTeamForm } from "@/features/teams/create-team-form";
import { TeamSummaryCard } from "@/features/teams/team-summary-card";
import { ErrorState } from "@/components/ui/error-state";
import { Panel } from "@/components/ui/panel";
import { InviteManagementPanel } from "@/features/invites/invite-management-panel";
import { JoinRequestsPanel } from "@/features/teams/join-requests-panel";
import { canCreateInvites, canReviewJoinRequests } from "@/types/permissions";
import { routes } from "@/config/routes";
import { DashboardSessionStrip } from "@/features/sessions/dashboard-session-strip";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }

  if (session.status === "error") {
    return (
      <ErrorState
        title="Could not verify session"
        message={session.message}
      />
    );
  }

  const teams = await listMyWorkspaces(session.user.id);
  if (!teams.ok) {
    return <ErrorState title="Could not load teams" message={teams.message} />;
  }

  const label = session.user.displayName || session.user.email || "Signed-in member";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10 sm:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-sync">
        WORKSPACE
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Signed in as {label}. Owners run the master clock. Approved members
            open PlayBox and generate the click on their own device.
          </p>
        </div>
        <LogoutButton />
      </div>

      {teams.workspaces.length === 0 ? (
        <Panel>
          <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
            MY TEAM
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            Create your workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            You become OWNER automatically. Invite members with a shareable
            link after the team exists.
          </p>
          <div className="mt-6">
            <CreateTeamForm />
          </div>
        </Panel>
      ) : (
        <>
          <DashboardSessionStrip workspaces={teams.workspaces} />
          {teams.workspaces.map((workspace) => (
          <div key={workspace.teamId} className="flex flex-col gap-6">
            <TeamSummaryCard workspace={workspace} />
            {canCreateInvites(workspace.role, workspace.membershipStatus) ? (
              <InviteManagementPanel teamId={workspace.teamId} />
            ) : null}
            {canReviewJoinRequests(workspace.role, workspace.membershipStatus) ? (
              <JoinRequestsPanel teamId={workspace.teamId} />
            ) : null}
          </div>
          ))}
        </>
      )}

      {teams.workspaces.length > 0 ? (
        <Panel>
          <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
            NEW TEAM
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Create another workspace. You will be OWNER of the new team.
          </p>
          <div className="mt-6">
            <CreateTeamForm />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
