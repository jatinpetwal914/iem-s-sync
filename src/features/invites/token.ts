import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_MAX_USES = 20;
export const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function parseInviteToken(
  rawToken: string,
): { ok: true; token: string } | { ok: false } {
  if (!INVITE_TOKEN_PATTERN.test(rawToken)) {
    return { ok: false };
  }

  return { ok: true, token: rawToken };
}
