import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { listMyWorkspaces } from "@/features/teams/queries";
import { CreateTeamForm } from "@/features/teams/create-team-form";
import { TeamSummaryCard } from "@/features/teams/team-summary-card";
import { ErrorState } from "@/components/ui/error-state";
import { Panel } from "@/components/ui/panel";
import { routes, teamRoute } from "@/config/routes";

export const metadata: Metadata = {
  title: "Team",
};

export default async function TeamIndexPage() {
  const session = await getAuthSession();

  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }

  if (session.status === "error") {
    return (
      <ErrorState title="Could not verify session" message={session.message} />
    );
  }

  const teams = await listMyWorkspaces(session.user.id);
  if (!teams.ok) {
    return <ErrorState title="Could not load teams" message={teams.message} />;
  }

  if (teams.workspaces.length === 1) {
    const onlyTeam = teams.workspaces[0];
    if (onlyTeam) {
      redirect(teamRoute(onlyTeam.teamId));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10 sm:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-accent">
        TEAMS
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Workspaces</h1>
      <p className="max-w-xl text-sm leading-6 text-muted">
        Create a team to become OWNER, then manage members from the workspace
        page.
      </p>

      {teams.workspaces.length === 0 ? (
        <Panel>
          <CreateTeamForm />
        </Panel>
      ) : (
        teams.workspaces.map((workspace) => (
          <TeamSummaryCard key={workspace.teamId} workspace={workspace} />
        ))
      )}
    </div>
  );
}
