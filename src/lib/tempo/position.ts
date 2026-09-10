import {
  MILLISECONDS_PER_MINUTE,
  SECONDS_PER_MINUTE,
} from "@/lib/tempo/constants";
import {
  assertNonNegativeFinite,
  parseBpm,
  parseSampleRate,
  requireParsed,
} from "@/lib/tempo/validation";
import type { TempoPosition } from "@/lib/tempo/types";

const BOUNDARY_EPSILON = 1e-9;

export function beatsElapsedFromMs(elapsedMs: number, bpm: number): number {
  assertNonNegativeFinite(elapsedMs, "Elapsed milliseconds");
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  return (elapsedMs * validBpm) / MILLISECONDS_PER_MINUTE;
}

export function beatsElapsedFromSamples(
  sampleIndex: number,
  bpm: number,
  sampleRate: number,
): number {
  assertNonNegativeFinite(sampleIndex, "Sample index");
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  const validRate = requireParsed(parseSampleRate(sampleRate), "Sample rate");
  return (sampleIndex * validBpm) / (validRate * SECONDS_PER_MINUTE);
}

export function positionFromBeatsElapsed(
  beatsElapsed: number,
  beatsPerBar: number,
): TempoPosition {
  assertNonNegativeFinite(beatsElapsed, "Beats elapsed");
  if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1) {
    throw new Error("Beats per bar must be a positive integer");
  }

  const completedBeats = stableFloor(beatsElapsed);
  const beatNumber = completedBeats + 1;
  const barNumber = Math.floor(completedBeats / beatsPerBar) + 1;
  const beatInBar = (completedBeats % beatsPerBar) + 1;

  return {
    beatsElapsed,
    beatNumber,
    barNumber,
    beatInBar,
  };
}

function stableFloor(value: number): number {
  return Math.floor(value + BOUNDARY_EPSILON);
}
