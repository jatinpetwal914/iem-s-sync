import { describe, expect, it } from "vitest";
import { canControlTeamSession, canAccessPlayBox, canDecideJoinRequest } from "@/types/permissions";

describe("security policy (application layer; RLS remains authoritative)", () => {
  it("prevents members from controlling the master session", () => {
    expect(canControlTeamSession("MEMBER", "approved")).toBe(false);
    expect(canControlTeamSession("ADMIN", "approved")).toBe(true);
    expect(canControlTeamSession("OWNER", "rejected")).toBe(false);
  });

  it("keeps PlayBox closed for rejected and removed members", () => {
    expect(canAccessPlayBox("rejected")).toBe(false);
    expect(canAccessPlayBox("removed")).toBe(false);
    expect(canAccessPlayBox("pending")).toBe(false);
  });

  it("prevents members from approving anyone, including themselves", () => {
    expect(canDecideJoinRequest("MEMBER", "approved", "pending")).toBe(false);
    expect(canDecideJoinRequest("OWNER", "approved", "pending")).toBe(true);
  });
});
