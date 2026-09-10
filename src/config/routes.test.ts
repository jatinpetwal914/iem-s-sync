import { describe, expect, it } from "vitest";
import {
  isGuestRoute,
  isProtectedRoute,
  protectedRoutes,
  routes,
  safeNextPath,
  teamRoute,
  teamMembersRoute,
  inviteRoute,
  loginWithNext,
  signupWithNext,
  sessionRoute,
  playboxRoute,
  beatControlRoute,
  sessionsRoute,
  devicesRoute,
} from "@/config/routes";

describe("routes", () => {
  it("defines the application route map", () => {
    expect(routes.login).toBe("/login");
    expect(routes.signup).toBe("/signup");
    expect(routes.dashboard).toBe("/dashboard");
    expect(routes.authCallback).toBe("/auth/callback");
    expect(routes.teamMembers).toBe("/team/members");
    expect(routes.teamInvite).toBe("/team/invite");
    expect(routes.beatControl).toBe("/beat-control");
    expect(routes.playbox).toBe("/playbox");
    expect(sessionRoute("abc")).toBe("/session/abc");
    expect(teamRoute("team-1")).toBe("/team/team-1");
    expect(teamMembersRoute("team-1")).toBe("/team/team-1/members");
    expect(inviteRoute("tok_abc")).toBe("/invite/tok_abc");
    expect(playboxRoute("team-1")).toBe("/playbox/team-1");
    expect(beatControlRoute("team-1")).toBe("/beat-control/team-1");
    expect(sessionsRoute("team-1")).toBe("/sessions/team-1");
    expect(devicesRoute("team-1")).toBe("/devices/team-1");
    expect(loginWithNext("/invite/tok_abc")).toBe(
      "/login?next=%2Finvite%2Ftok_abc",
    );
    expect(signupWithNext("/invite/tok_abc")).toBe(
      "/signup?next=%2Finvite%2Ftok_abc",
    );
  });

  it("marks authenticated surfaces as protected", () => {
    expect(protectedRoutes).toContain(routes.dashboard);
    expect(protectedRoutes).toContain(routes.playbox);
    expect(protectedRoutes).toContain(routes.beatControl);
    expect(protectedRoutes).not.toContain(routes.login);
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/team/abc")).toBe(true);
    expect(isProtectedRoute("/playbox/team-1")).toBe(true);
    expect(isProtectedRoute("/beat-control/team-1")).toBe(true);
    expect(isProtectedRoute("/sessions/team-1")).toBe(true);
    expect(isProtectedRoute("/devices/team-1")).toBe(true);
    expect(isProtectedRoute("/invite/tok_abc")).toBe(false);
    expect(isGuestRoute("/login")).toBe(true);
    expect(isGuestRoute("/dashboard")).toBe(false);
  });

  it("rejects open redirects in next paths", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("/invite/tok_abc")).toBe("/invite/tok_abc");
    expect(safeNextPath("/login")).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
  });
});
