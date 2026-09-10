import { redirect } from "next/navigation";
import { getAuthSession, type CurrentUser } from "@/features/auth/get-current-user";
import { getAuthGateState } from "@/features/auth/get-auth-gate-state";
import { routes } from "@/config/routes";

export async function requireAuthenticatedUser(): Promise<CurrentUser> {
  const session = await getAuthSession();

  if (session.status === "error") {
    throw new Error(session.message);
  }

  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }

  return session.user;
}

export async function redirectIfAuthenticated(nextPath?: string) {
  const gate = await getAuthGateState();

  if (gate === "authenticated") {
    redirect(nextPath ?? routes.dashboard);
  }
}
