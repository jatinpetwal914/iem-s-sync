import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  isDuplicateSignupUser,
  isNetworkFailure,
} from "@/features/auth/auth-errors";

describe("authErrorMessage", () => {
  it("maps invalid credentials", () => {
    expect(
      authErrorMessage(
        new AuthApiError("Invalid login", 400, "invalid_credentials"),
      ),
    ).toBe("Invalid email or password.");
  });

  it("maps an existing email", () => {
    expect(
      authErrorMessage(new AuthApiError("Taken", 422, "email_exists")),
    ).toBe("An account with this email already exists. Try logging in.");
  });

  it("maps unconfirmed email", () => {
    expect(
      authErrorMessage(
        new AuthApiError("Unconfirmed", 400, "email_not_confirmed"),
      ),
    ).toContain("Confirm your email");
  });

  it("maps expired sessions", () => {
    expect(
      authErrorMessage(new AuthApiError("Expired", 401, "session_expired")),
    ).toBe("Your session expired. Please sign in again.");
  });

  it("maps network failures", () => {
    expect(
      authErrorMessage(new AuthRetryableFetchError("offline", 0)),
    ).toBe("Network error. Check your connection and try again.");
    expect(isNetworkFailure(new TypeError("Failed to fetch"))).toBe(true);
  });
});

describe("isDuplicateSignupUser", () => {
  it("detects the email-enumeration empty identity response", () => {
    expect(isDuplicateSignupUser({ identities: [] })).toBe(true);
    expect(isDuplicateSignupUser({ identities: [{ id: "1" }] })).toBe(false);
    expect(isDuplicateSignupUser(null)).toBe(false);
  });
});
