import type { TimeSignature } from "@/lib/tempo/types";

export type SessionTransportStatus = "stopped" | "playing" | "paused";

export type AppSessionStatus =
  | "IDLE"
  | "SCHEDULED"
  | "PLAYING"
  | "PAUSED"
  | "STOPPED";

export type PlaybackPosition = {
  elapsedMs: number;
  beatIndex: number;
  barIndex: number;
  beatNumber: number;
  barNumber: number;
  beatInBar: number;
  phase: number;
  isPlaying: boolean;
  isScheduled: boolean;
};

export type PlaybackPositionInput = {
  startAt: string | number | null;
  now: number;
  bpm: number;
  timeSignature: string | TimeSignature;
  status: SessionTransportStatus;
  positionBeats?: number | null;
};
