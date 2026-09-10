import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { listMyWorkspaces } from "@/features/teams/queries";
import { routes, teamMembersRoute } from "@/config/routes";

export default async function TeamMembersIndexPage() {
  const session = await getAuthSession();

  if (session.status !== "authenticated") {
    redirect(routes.login);
  }

  const teams = await listMyWorkspaces(session.user.id);
  const first = teams.ok ? teams.workspaces[0] : undefined;

  if (!first) {
    redirect(routes.team);
  }

  redirect(teamMembersRoute(first.teamId));
}
