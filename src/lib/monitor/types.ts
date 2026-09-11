export const SELF_SOURCE_ID = "self";
export const SYNC_SOURCE_ID = "sync";

export type MonitorSourceId = typeof SELF_SOURCE_ID | typeof SYNC_SOURCE_ID | string;

export type MonitorSourceState = {
  gain: number;
  muted: boolean;
  solo: boolean;
};

export type MonitorSources = Record<string, MonitorSourceState>;

export type MonitorMixRecord = {
  id: string;
  teamId: string;
  receiverId: string;
  sources: MonitorSources;
  locked: boolean;
  revision: number;
  updatedAt: string;
};

export type MonitorRosterMember = {
  membershipId: string;
  userId: string;
  displayName: string;
  role: string;
};

export type MonitorHealth = "OFF" | "CONNECTING" | "READY" | "DEGRADED" | "OFFLINE";

export type MonitorPeerHealth = {
  userId: string;
  health: MonitorHealth;
  micReady: boolean;
};

export const EMPTY_SOURCE: MonitorSourceState = {
  gain: 0,
  muted: false,
  solo: false,
};
