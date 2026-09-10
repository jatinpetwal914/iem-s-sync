import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { listMyWorkspaces } from "@/features/teams/queries";
import { canControlTeamSession } from "@/types/permissions";
import { sessionsRoute, routes } from "@/config/routes";

export const metadata: Metadata = { title: "Sessions" };
export const dynamic = "force-dynamic";

export default async function SessionsIndexPage() {
  const session = await getAuthSession();
  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (session.status === "error") {
    redirect(routes.dashboard);
  }
  const teams = await listMyWorkspaces(session.user.id);
  const workspace = teams.ok
    ? teams.workspaces.find((item) =>
        canControlTeamSession(item.role, item.membershipStatus),
      )
    : null;
  redirect(workspace ? sessionsRoute(workspace.teamId) : routes.dashboard);
}
