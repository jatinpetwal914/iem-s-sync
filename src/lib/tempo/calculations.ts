import {
  MILLISECONDS_PER_MINUTE,
  SECONDS_PER_MINUTE,
  DEFAULT_TIME_SIGNATURE,
} from "@/lib/tempo/constants";
import { parseBpm, parseSampleRate, requireParsed } from "@/lib/tempo/validation";
import { parseTimeSignature } from "@/lib/tempo/time-signature";
import type { TempoSnapshot, TimeSignature } from "@/lib/tempo/types";

export function bpsFromBpm(bpm: number): number {
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  return validBpm / SECONDS_PER_MINUTE;
}

export function intervalMsFromBpm(bpm: number): number {
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  return MILLISECONDS_PER_MINUTE / validBpm;
}

export function samplesPerBeatFromBpm(
  bpm: number,
  sampleRate: number,
): number {
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  const validRate = requireParsed(parseSampleRate(sampleRate), "Sample rate");
  return (validRate * SECONDS_PER_MINUTE) / validBpm;
}

export function beatsPerSecond(bpm: number): number {
  return bpsFromBpm(bpm);
}

export function beatIntervalMs(bpm: number): number {
  return intervalMsFromBpm(bpm);
}

export function samplesPerBeat(bpm: number, sampleRate: number): number {
  return samplesPerBeatFromBpm(bpm, sampleRate);
}

export function createTempoSnapshot(
  bpm: number,
  sampleRate: number,
  timeSignature: TimeSignature | string = DEFAULT_TIME_SIGNATURE,
): TempoSnapshot {
  const validBpm = requireParsed(parseBpm(bpm), "BPM");
  const validRate = requireParsed(parseSampleRate(sampleRate), "Sample rate");
  const parsedSignature = parseTimeSignature(timeSignature);
  if (!parsedSignature.ok) {
    throw new Error(parsedSignature.issues[0] ?? "Time signature is invalid");
  }

  const bps = validBpm / SECONDS_PER_MINUTE;
  const intervalMs = MILLISECONDS_PER_MINUTE / validBpm;
  const samplesPerBeatValue = (validRate * SECONDS_PER_MINUTE) / validBpm;

  return {
    bpm: validBpm,
    bps,
    beatsPerSecond: bps,
    intervalMs,
    sampleRate: validRate,
    samplesPerBeat: samplesPerBeatValue,
    timeSignature: parsedSignature.value,
  };
}
