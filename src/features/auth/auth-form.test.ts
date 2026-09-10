import { describe, expect, it } from "vitest";
import { authGateFromClaims } from "@/features/auth/auth-gate";
import { parseAuthForm } from "@/features/auth/auth-form";

describe("authGateFromClaims", () => {
  it("treats a missing or empty claim set as unauthenticated", () => {
    expect(authGateFromClaims(null)).toBe("unauthenticated");
    expect(authGateFromClaims({})).toBe("unauthenticated");
  });

  it("treats a verified subject as authenticated", () => {
    expect(authGateFromClaims({ sub: "user-1" })).toBe("authenticated");
  });
});

describe("parseAuthForm", () => {
  it("accepts a valid email and password", () => {
    expect(
      parseAuthForm({
        email: "  Player@Band.studio ",
        password: "clicktrack",
      }),
    ).toEqual({
      ok: true,
      value: { email: "player@band.studio", password: "clicktrack" },
    });
  });

  it("rejects invalid credentials without creating a session", () => {
    const result = parseAuthForm({ email: "not-an-email", password: "short" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain("Enter a valid email address");
      expect(result.issues).toContain("Password must be at least 8 characters");
    }
  });
});
