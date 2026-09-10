import { describe, expect, it } from "vitest";
import { parseBpm, parseBpmInput, parseSampleRate } from "@/lib/tempo/validation";
import { parseTimeSignature } from "@/lib/tempo/time-signature";
import { parseTempoEngineOptions } from "@/lib/tempo/engine";
import { BPM_MAX, BPM_MIN } from "@/lib/tempo/constants";

describe("tempo validation", () => {
  it("accepts BPM inside the engine bounds, including 240+", () => {
    expect(parseBpm(60).ok).toBe(true);
    expect(parseBpm(240).ok).toBe(true);
    expect(parseBpm(241).ok).toBe(true);
    expect(parseBpm(1_000).ok).toBe(true);
    expect(parseBpm(BPM_MIN).ok).toBe(true);
    expect(parseBpm(BPM_MAX).ok).toBe(true);
  });

  it("rejects invalid BPM values", () => {
    expect(parseBpm(0).ok).toBe(false);
    expect(parseBpm(-1).ok).toBe(false);
    expect(parseBpm(Number.NaN).ok).toBe(false);
    expect(parseBpm(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(parseBpm(BPM_MAX + 1).ok).toBe(false);
    expect(parseBpmInput("").ok).toBe(false);
    expect(parseBpmInput("   ").ok).toBe(false);
    expect(parseBpmInput("abc").ok).toBe(false);
    expect(parseBpmInput("0").ok).toBe(false);
    expect(parseBpmInput("-90").ok).toBe(false);
    expect(parseBpmInput("124").value).toBe(124);
    expect(parseBpmInput("124.5").value).toBe(124.5);
  });

  it("accepts common audio sample rates and rejects empty ones", () => {
    expect(parseSampleRate(44_100).ok).toBe(true);
    expect(parseSampleRate(48_000).ok).toBe(true);
    expect(parseSampleRate(0).ok).toBe(false);
    expect(parseSampleRate(-44_100).ok).toBe(false);
    expect(parseSampleRate(Number.NaN).ok).toBe(false);
  });

  it("parses time signatures used by the click grid", () => {
    expect(parseTimeSignature("4/4").value).toEqual({
      numerator: 4,
      denominator: 4,
    });
    expect(parseTimeSignature("3/4").value).toEqual({
      numerator: 3,
      denominator: 4,
    });
    expect(parseTimeSignature("6/8").value).toEqual({
      numerator: 6,
      denominator: 8,
    });
    expect(parseTimeSignature("7/8").value).toEqual({
      numerator: 7,
      denominator: 8,
    });
    expect(parseTimeSignature("5/4").value).toEqual({
      numerator: 5,
      denominator: 4,
    });
    expect(parseTimeSignature({ numerator: 2, denominator: 2 }).value).toEqual({
      numerator: 2,
      denominator: 2,
    });
  });

  it("defaults a missing time signature to 4/4", () => {
    expect(parseTimeSignature(undefined).value).toEqual({
      numerator: 4,
      denominator: 4,
    });
  });

  it("rejects malformed time signatures", () => {
    expect(parseTimeSignature("4").ok).toBe(false);
    expect(parseTimeSignature("0/4").ok).toBe(false);
    expect(parseTimeSignature("4/0").ok).toBe(false);
    expect(parseTimeSignature("4/3").ok).toBe(false);
    expect(parseTimeSignature("4 / 4").ok).toBe(false);
    expect(parseTimeSignature("99/4").ok).toBe(false);
    expect(parseTimeSignature({ numerator: 4.5, denominator: 4 }).ok).toBe(
      false,
    );
  });

  it("collects every engine option issue", () => {
    const parsed = parseTempoEngineOptions({
      bpm: 0,
      sampleRate: 0,
      timeSignature: "nope",
    });
    expect(parsed.ok).toBe(false);
    expect(parsed.issues.length).toBeGreaterThanOrEqual(3);
  });
});
