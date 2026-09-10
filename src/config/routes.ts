export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  authCallback: "/auth/callback",
  team: "/team",
  teamMembers: "/team/members",
  teamInvite: "/team/invite",
  beatControl: "/beat-control",
  playbox: "/playbox",
  sessions: "/sessions",
  devices: "/devices",
  settings: "/settings",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];

export function sessionRoute(sessionId: string): `/session/${string}` {
  return `/session/${sessionId}`;
}

export function teamRoute(teamId: string): `/team/${string}` {
  return `/team/${teamId}`;
}

export function teamMembersRoute(teamId: string): `/team/${string}/members` {
  return `/team/${teamId}/members`;
}

export function playboxRoute(teamId: string): `/playbox/${string}` {
  return `/playbox/${teamId}`;
}

export function beatControlRoute(teamId: string): `/beat-control/${string}` {
  return `/beat-control/${teamId}`;
}

export function sessionsRoute(teamId: string): `/sessions/${string}` {
  return `/sessions/${teamId}`;
}

export function devicesRoute(teamId: string): `/devices/${string}` {
  return `/devices/${teamId}`;
}

export function inviteRoute(token: string): `/invite/${string}` {
  return `/invite/${token}`;
}

export function loginWithNext(nextPath: string): string {
  if (nextPath === routes.dashboard) {
    return routes.login;
  }

  return `${routes.login}?next=${encodeURIComponent(nextPath)}`;
}

export function signupWithNext(nextPath: string): string {
  if (nextPath === routes.dashboard) {
    return routes.signup;
  }

  return `${routes.signup}?next=${encodeURIComponent(nextPath)}`;
}

export const protectedRoutes = [
  routes.dashboard,
  routes.team,
  routes.teamMembers,
  routes.teamInvite,
  routes.beatControl,
  routes.playbox,
  routes.sessions,
  routes.devices,
  routes.settings,
] as const;

export const guestRoutes = [routes.login, routes.signup] as const;

export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isGuestRoute(pathname: string): boolean {
  return guestRoutes.some((route) => pathname === route);
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value) {
    return routes.dashboard;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return routes.dashboard;
  }

  if (isGuestRoute(value) || value.startsWith(routes.authCallback)) {
    return routes.dashboard;
  }

  return value;
}
