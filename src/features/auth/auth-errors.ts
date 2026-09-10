import {
  isAuthError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";

export function isNetworkFailure(error: unknown): boolean {
  if (isAuthRetryableFetchError(error)) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("network request failed")
    );
  }

  return false;
}

export function authErrorMessage(error: unknown): string {
  if (isNetworkFailure(error)) {
    return "Network error. Check your connection and try again.";
  }

  if (!isAuthError(error)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "invalid_credentials":
      return "Invalid email or password.";
    case "email_exists":
    case "user_already_exists":
      return "An account with this email already exists. Try logging in.";
    case "email_not_confirmed":
      return "Confirm your email before signing in. Check your inbox for the link.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "weak_password":
      return "Password is too weak. Use at least 8 characters.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a moment and try again.";
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
    case "bad_jwt":
      return "Your session expired. Please sign in again.";
    case "user_banned":
      return "This account is currently blocked.";
    case "signup_disabled":
      return "New accounts cannot be created right now.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}

export function isDuplicateSignupUser(user: {
  identities?: unknown[] | null;
} | null): boolean {
  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
}
