import { START_AT_LEAD_MS } from "@/lib/sync/constants";
import { MILLISECONDS_PER_MINUTE } from "@/lib/tempo/constants";
import { parseBpm, requireParsed } from "@/lib/tempo/validation";
import type { AppSessionStatus, SessionTransportStatus } from "@/lib/sync/types";

export function computePlayStartAt(nowMs: number): number {
  return nowMs + START_AT_LEAD_MS;
}

export function computeResumeStartAt(
  nowMs: number,
  positionBeats: number,
  bpm: number,
): number {
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  const intervalMs = MILLISECONDS_PER_MINUTE / validBpm;
  return nowMs + START_AT_LEAD_MS - positionBeats * intervalMs;
}

export function computeTempoChangeStartAt(
  nowMs: number,
  positionBeats: number,
  bpm: number,
): number {
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  const intervalMs = MILLISECONDS_PER_MINUTE / validBpm;
  return nowMs - positionBeats * intervalMs;
}

export function beatsElapsedAt(nowMs: number, startAtMs: number, bpm: number): number {
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  const elapsedMs = nowMs - startAtMs;
  if (elapsedMs <= 0) {
    return 0;
  }
  return (elapsedMs * validBpm) / MILLISECONDS_PER_MINUTE;
}

export function deriveAppSessionStatus(input: {
  status: SessionTransportStatus;
  startAt: string | number | null;
  now: number;
  positionBeats: number;
}): AppSessionStatus {
  if (input.status === "paused") {
    return "PAUSED";
  }
  if (input.status === "stopped") {
    return input.positionBeats > 0 ? "STOPPED" : "IDLE";
  }

  const startAtMs =
    typeof input.startAt === "number"
      ? input.startAt
      : input.startAt
        ? Date.parse(input.startAt)
        : Number.NaN;
  if (!Number.isFinite(startAtMs) || input.now < startAtMs) {
    return "SCHEDULED";
  }
  return "PLAYING";
}

export type TransportCommand =
  | "play"
  | "pause"
  | "resume"
  | "stop"
  | "reset";

export function canTransition(
  status: SessionTransportStatus,
  command: TransportCommand,
): boolean {
  switch (command) {
    case "play":
      return status === "stopped";
    case "pause":
      return status === "playing";
    case "resume":
      return status === "paused";
    case "stop":
      return status === "playing" || status === "paused";
    case "reset":
      return true;
  }
}
