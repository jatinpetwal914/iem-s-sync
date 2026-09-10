import type { AuthGateState } from "@/types/session";

export function authGateFromClaims(
  claims: { sub?: string } | null | undefined,
): AuthGateState {
  return claims?.sub ? "authenticated" : "unauthenticated";
}
