import { describe, expect, it } from "vitest";
import {
  canAccessPlayBox,
  canControlMasterSession,
  canControlTeamSession,
  canCreateInvites,
  canDecideJoinRequest,
  canEditTeamName,
  canManageMembers,
  canModifyTeamSettings,
  canRemoveApprovedMember,
  canReviewJoinRequests,
  canViewTeamRoster,
  hasCapability,
} from "@/types/permissions";

describe("authorization capabilities", () => {
  it("gives the owner full control", () => {
    expect(canControlMasterSession("OWNER")).toBe(true);
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canModifyTeamSettings("OWNER")).toBe(true);
    expect(hasCapability("OWNER", "createInvites")).toBe(true);
  });

  it("lets admins control the session and members, but not team settings", () => {
    expect(canControlMasterSession("ADMIN")).toBe(true);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canModifyTeamSettings("ADMIN")).toBe(false);
  });

  it("blocks members from master control and management", () => {
    expect(canControlMasterSession("MEMBER")).toBe(false);
    expect(canControlTeamSession("MEMBER", "approved")).toBe(false);
    expect(canControlTeamSession("OWNER", "pending")).toBe(false);
    expect(canControlTeamSession("OWNER", "approved")).toBe(true);
    expect(canControlTeamSession("ADMIN", "approved")).toBe(true);
    expect(canManageMembers("MEMBER")).toBe(false);
    expect(canModifyTeamSettings("MEMBER")).toBe(false);
    expect(hasCapability("MEMBER", "createInvites")).toBe(false);
    expect(canEditTeamName("MEMBER", "approved")).toBe(false);
    expect(canViewTeamRoster("MEMBER", "approved")).toBe(true);
    expect(canViewTeamRoster("MEMBER", "pending")).toBe(false);
  });

  it("lets only the owner rename a team", () => {
    expect(canEditTeamName("OWNER", "approved")).toBe(true);
    expect(canEditTeamName("ADMIN", "approved")).toBe(false);
    expect(canViewTeamRoster("OWNER", "approved")).toBe(true);
    expect(canViewTeamRoster("ADMIN", "approved")).toBe(true);
  });

  it("lets owners and admins create invitations", () => {
    expect(canCreateInvites("OWNER", "approved")).toBe(true);
    expect(canCreateInvites("ADMIN", "approved")).toBe(true);
    expect(canCreateInvites("MEMBER", "approved")).toBe(false);
    expect(canCreateInvites("OWNER", "pending")).toBe(false);
  });

  it("locks PlayBox to approved membership", () => {
    expect(canAccessPlayBox("approved")).toBe(true);
    expect(canAccessPlayBox("pending")).toBe(false);
    expect(canAccessPlayBox("rejected")).toBe(false);
    expect(canAccessPlayBox("removed")).toBe(false);
  });

  it("lets owners and admins review pending join requests", () => {
    expect(canReviewJoinRequests("OWNER", "approved")).toBe(true);
    expect(canReviewJoinRequests("ADMIN", "approved")).toBe(true);
    expect(canReviewJoinRequests("MEMBER", "approved")).toBe(false);
    expect(canReviewJoinRequests("OWNER", "pending")).toBe(false);
    expect(canDecideJoinRequest("OWNER", "approved", "pending")).toBe(true);
    expect(canDecideJoinRequest("OWNER", "approved", "approved")).toBe(false);
    expect(canDecideJoinRequest("MEMBER", "approved", "pending")).toBe(false);
  });

  it("lets owners and admins remove approved members only", () => {
    expect(canRemoveApprovedMember("OWNER", "approved", "MEMBER", "approved")).toBe(
      true,
    );
    expect(canRemoveApprovedMember("ADMIN", "approved", "MEMBER", "approved")).toBe(
      true,
    );
    expect(canRemoveApprovedMember("OWNER", "approved", "OWNER", "approved")).toBe(
      false,
    );
    expect(canRemoveApprovedMember("OWNER", "approved", "MEMBER", "pending")).toBe(
      false,
    );
    expect(canRemoveApprovedMember("MEMBER", "approved", "MEMBER", "approved")).toBe(
      false,
    );
  });
});
