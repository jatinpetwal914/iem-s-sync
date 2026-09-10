import { describe, expect, it } from "vitest";
import {
  generateInviteToken,
  hashInviteToken,
  parseInviteToken,
} from "@/features/invites/token";

describe("invite tokens", () => {
  it("generates a URL-safe token that hashes to sha256 hex", () => {
    const token = generateInviteToken();
    expect(parseInviteToken(token).ok).toBe(true);
    expect(hashInviteToken("phase5inviteToken_ok123456")).toBe(
      "02e20089338c34558feb80327fc221f6f0e4cbd34ee711c58c0fcb29e81de3ab",
    );
  });

  it("rejects tokens that could encode role or extra claims", () => {
    expect(parseInviteToken("")).toEqual({ ok: false });
    expect(parseInviteToken("short")).toEqual({ ok: false });
    expect(parseInviteToken("role=OWNER&token=aaaaaaaaaaaaaaaaaaaa")).toEqual({
      ok: false,
    });
    expect(parseInviteToken("aaaaaaaaaaaaaaaaaaaa/admin")).toEqual({
      ok: false,
    });
  });
});
