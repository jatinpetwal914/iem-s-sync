import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { listMyWorkspaces } from "@/features/teams/queries";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { canControlTeamSession } from "@/types/permissions";
import { beatControlRoute, playboxRoute, routes } from "@/config/routes";

export const metadata: Metadata = { title: "Beat Control" };
export const dynamic = "force-dynamic";

export default async function BeatControlIndexPage() {
  const session = await getAuthSession();
  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (session.status === "error") {
    return <ErrorState title="Could not verify session" message={session.message} />;
  }

  const teams = await listMyWorkspaces(session.user.id);
  if (!teams.ok) {
    return <ErrorState title="Could not load Beat Control" message={teams.message} />;
  }

  const controllable = teams.workspaces.filter((workspace) =>
    canControlTeamSession(workspace.role, workspace.membershipStatus),
  );

  if (controllable.length === 1 && controllable[0]) {
    redirect(beatControlRoute(controllable[0].teamId));
  }

  if (controllable.length > 1) {
    redirect(beatControlRoute(controllable[0]?.teamId ?? routes.dashboard));
  }

  const playable = teams.workspaces.find((workspace) => workspace.membershipStatus === "approved");
  if (playable) {
    redirect(playboxRoute(playable.teamId));
  }

  return (
    <EmptyState
      eyebrow="LOCKED"
      title="Beat Control is for owners and admins"
      message="Approved members use PlayBox. Ask an owner to promote you if you need master controls."
      actionHref={routes.dashboard}
      actionLabel="Back to dashboard"
    />
  );
}
