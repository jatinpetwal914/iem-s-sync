import { intervalMsFromBpm } from "@/lib/tempo/calculations";
import {
  beatsElapsedFromMs,
  positionFromBeatsElapsed,
} from "@/lib/tempo/position";
import { parseBpm, requireParsed } from "@/lib/tempo/validation";
import { beatsPerBar, parseTimeSignature } from "@/lib/tempo/time-signature";
import type { PlaybackPosition, PlaybackPositionInput } from "@/lib/sync/types";

export function startAtToEpochMs(startAt: string | number | null): number | null {
  if (startAt == null) {
    return null;
  }
  if (typeof startAt === "number") {
    return Number.isFinite(startAt) ? startAt : null;
  }
  const parsed = Date.parse(startAt);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getPlaybackPosition(
  input: PlaybackPositionInput,
): PlaybackPosition {
  requireParsed(parseBpm(input.bpm), "BPM");
  const signature = parseTimeSignature(input.timeSignature);
  if (!signature.ok) {
    throw new Error(signature.issues[0] ?? "Time signature is invalid");
  }
  const barLength = beatsPerBar(signature.value);
  const idle = idlePosition();

  if (input.status === "stopped") {
    return idle;
  }

  if (input.status === "paused") {
    const beatsElapsed = Math.max(0, input.positionBeats ?? 0);
    return fromBeats(beatsElapsed, barLength, {
      elapsedMs: beatsElapsed * intervalMsFromBpm(input.bpm),
      isPlaying: false,
      isScheduled: false,
    });
  }

  const startAtMs = startAtToEpochMs(input.startAt);
  if (startAtMs == null) {
    return { ...idle, isPlaying: false, isScheduled: true };
  }

  const elapsedMs = input.now - startAtMs;
  if (elapsedMs < 0) {
    return {
      ...idle,
      elapsedMs,
      isPlaying: true,
      isScheduled: true,
    };
  }

  return fromBeats(beatsElapsedFromMs(elapsedMs, input.bpm), barLength, {
    elapsedMs,
    isPlaying: true,
    isScheduled: false,
  });
}

function idlePosition(): PlaybackPosition {
  return {
    elapsedMs: 0,
    beatIndex: 0,
    barIndex: 0,
    beatNumber: 1,
    barNumber: 1,
    beatInBar: 1,
    phase: 0,
    isPlaying: false,
    isScheduled: false,
  };
}

function fromBeats(
  beatsElapsed: number,
  barLength: number,
  flags: Pick<PlaybackPosition, "elapsedMs" | "isPlaying" | "isScheduled">,
): PlaybackPosition {
  const position = positionFromBeatsElapsed(beatsElapsed, barLength);
  const beatIndex = position.beatNumber - 1;

  return {
    elapsedMs: flags.elapsedMs,
    beatIndex,
    barIndex: position.barNumber - 1,
    beatNumber: position.beatNumber,
    barNumber: position.barNumber,
    beatInBar: position.beatInBar,
    phase: beatsElapsed - beatIndex,
    isPlaying: flags.isPlaying,
    isScheduled: flags.isScheduled,
  };
}
