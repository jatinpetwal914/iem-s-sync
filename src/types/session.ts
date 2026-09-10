export const playbackStates = ["stopped", "playing", "paused"] as const;
export type PlaybackState = (typeof playbackStates)[number];

export const syncQualities = [
  "EXCELLENT",
  "GOOD",
  "UNSTABLE",
  "OFFLINE",
] as const;
export type SyncQuality = (typeof syncQualities)[number];

export const membershipStatuses = [
  "pending",
  "approved",
  "rejected",
  "removed",
] as const;
export type MembershipStatus = (typeof membershipStatuses)[number];

export const inviteStatuses = [
  "active",
  "expired",
  "revoked",
  "exhausted",
] as const;
export type InviteStatus = (typeof inviteStatuses)[number];

export const authGateStates = ["unauthenticated", "authenticated"] as const;
export type AuthGateState = (typeof authGateStates)[number];
