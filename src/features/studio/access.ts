import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { getTeamDetail, listMyWorkspaces } from "@/features/teams/queries";
import {
  canAccessPlayBox,
  canControlTeamSession,
} from "@/types/permissions";
import type { TeamWorkspace } from "@/features/teams/types";
import type { CurrentUser } from "@/features/auth/get-current-user";
import { routes } from "@/config/routes";

export type StudioAccess =
  | { status: "unauthenticated" }
  | { status: "error"; message: string }
  | { status: "forbidden"; message: string }
  | {
      status: "ok";
      user: CurrentUser;
      workspace: TeamWorkspace;
    };

export async function requireStudioTeam(teamId: string): Promise<StudioAccess> {
  const session = await getAuthSession();
  if (session.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }
  if (session.status === "error") {
    return { status: "error", message: session.message };
  }

  const detail = await getTeamDetail(teamId, session.user.id);
  if (!detail.ok) {
    if (detail.notFound) {
      return { status: "forbidden", message: "This team is not available." };
    }
    return { status: "error", message: detail.message };
  }

  return {
    status: "ok",
    user: session.user,
    workspace: detail.detail.workspace,
  };
}

export async function firstApprovedWorkspace(userId: string): Promise<
  | { ok: true; workspace: TeamWorkspace | null }
  | { ok: false; message: string }
> {
  const teams = await listMyWorkspaces(userId);
  if (!teams.ok) {
    return teams;
  }
  return { ok: true, workspace: teams.workspaces[0] ?? null };
}

export function redirectToLogin(): never {
  redirect(routes.login);
}

export { canAccessPlayBox, canControlTeamSession };
