import { describe, expect, it } from "vitest";
import {
  MILLISECONDS_PER_MINUTE,
  SECONDS_PER_MINUTE,
} from "@/lib/tempo/constants";
import {
  beatIntervalMs,
  beatsPerSecond,
  bpsFromBpm,
  createTempoSnapshot,
  intervalMsFromBpm,
  samplesPerBeat,
  samplesPerBeatFromBpm,
} from "@/lib/tempo/calculations";

const SAMPLE_RATES = [8_000, 44_100, 48_000, 96_000];
const TEMPOS = [60, 75, 90, 120, 140.5, 180, 240, 333, 1_000];

function expectedBps(bpm: number): number {
  return bpm / SECONDS_PER_MINUTE;
}

function expectedIntervalMs(bpm: number): number {
  return MILLISECONDS_PER_MINUTE / bpm;
}

function expectedSamplesPerBeat(bpm: number, sampleRate: number): number {
  return (sampleRate * SECONDS_PER_MINUTE) / bpm;
}

describe("tempo calculations", () => {
  it("derives BPS, intervalMs, and samplesPerBeat from the published formulas", () => {
    for (const bpm of TEMPOS) {
      expect(bpsFromBpm(bpm)).toBe(expectedBps(bpm));
      expect(intervalMsFromBpm(bpm)).toBe(expectedIntervalMs(bpm));
      expect(beatsPerSecond(bpm)).toBe(bpsFromBpm(bpm));
      expect(beatIntervalMs(bpm)).toBe(intervalMsFromBpm(bpm));

      for (const sampleRate of SAMPLE_RATES) {
        expect(samplesPerBeatFromBpm(bpm, sampleRate)).toBe(
          expectedSamplesPerBeat(bpm, sampleRate),
        );
        expect(samplesPerBeat(bpm, sampleRate)).toBe(
          samplesPerBeatFromBpm(bpm, sampleRate),
        );
      }
    }
  });

  it("keeps formula identities without storing BPM lookup tables", () => {
    for (const bpm of TEMPOS) {
      const bps = bpsFromBpm(bpm);
      const intervalMs = intervalMsFromBpm(bpm);

      expect(bps * SECONDS_PER_MINUTE).toBeCloseTo(bpm, 10);
      expect(intervalMs * bpm).toBeCloseTo(MILLISECONDS_PER_MINUTE, 8);
      expect(intervalMs).toBeCloseTo(1000 / bps, 10);

      for (const sampleRate of SAMPLE_RATES) {
        const samples = samplesPerBeatFromBpm(bpm, sampleRate);
        expect(samples * bps).toBeCloseTo(sampleRate, 8);
        expect(samples * bpm).toBeCloseTo(sampleRate * SECONDS_PER_MINUTE, 6);
      }
    }
  });

  it("builds a snapshot from the same live formulas", () => {
    const bpm = 96;
    const sampleRate = 48_000;
    const snapshot = createTempoSnapshot(bpm, sampleRate);

    expect(snapshot.bpm).toBe(bpm);
    expect(snapshot.sampleRate).toBe(sampleRate);
    expect(snapshot.bps).toBe(expectedBps(bpm));
    expect(snapshot.beatsPerSecond).toBe(snapshot.bps);
    expect(snapshot.intervalMs).toBe(expectedIntervalMs(bpm));
    expect(snapshot.samplesPerBeat).toBe(
      expectedSamplesPerBeat(bpm, sampleRate),
    );
    expect(snapshot.timeSignature).toEqual({ numerator: 4, denominator: 4 });
  });

  it("accepts an explicit time signature on the snapshot", () => {
    const snapshot = createTempoSnapshot(100, 44_100, "7/8");
    expect(snapshot.timeSignature).toEqual({ numerator: 7, denominator: 8 });
  });

  it("rejects non-finite and out-of-range operands", () => {
    expect(() => bpsFromBpm(0)).toThrow(/greater than 0/);
    expect(() => intervalMsFromBpm(-90)).toThrow(/greater than 0/);
    expect(() => bpsFromBpm(Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => bpsFromBpm(Number.NaN)).toThrow(/finite/);
    expect(() => samplesPerBeatFromBpm(120, 0)).toThrow(/greater than 0/);
    expect(() => samplesPerBeatFromBpm(120, Number.NaN)).toThrow(/finite/);
    expect(() => createTempoSnapshot(12_000, 44_100)).toThrow(/between/);
    expect(() => createTempoSnapshot(120, 500_000)).toThrow(/between/);
  });
});
