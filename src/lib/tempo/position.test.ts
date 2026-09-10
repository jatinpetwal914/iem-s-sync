import { describe, expect, it } from "vitest";
import { intervalMsFromBpm, samplesPerBeatFromBpm } from "@/lib/tempo/calculations";
import {
  beatsElapsedFromMs,
  beatsElapsedFromSamples,
  positionFromBeatsElapsed,
} from "@/lib/tempo/position";
import { createTempoEngine } from "@/lib/tempo/engine";

describe("beat and bar position", () => {
  it("starts on beat 1 of bar 1 at elapsed 0", () => {
    const position = positionFromBeatsElapsed(0, 4);
    expect(position.beatNumber).toBe(1);
    expect(position.barNumber).toBe(1);
    expect(position.beatInBar).toBe(1);
  });

  it("advances beatNumber and barNumber from elapsed time using derived intervals", () => {
    const bpm = 128;
    const engine = createTempoEngine({
      bpm,
      sampleRate: 48_000,
      timeSignature: "4/4",
    });
    const intervalMs = intervalMsFromBpm(bpm);

    const secondBeat = engine.positionAtElapsedMs(intervalMs);
    expect(secondBeat.beatNumber).toBe(2);
    expect(secondBeat.barNumber).toBe(1);
    expect(secondBeat.beatInBar).toBe(2);

    const nextBar = engine.positionAtElapsedMs(intervalMs * engine.beatsPerBar);
    expect(nextBar.beatNumber).toBe(5);
    expect(nextBar.barNumber).toBe(2);
    expect(nextBar.beatInBar).toBe(1);
  });

  it("wraps beatInBar for odd meters", () => {
    const engine = createTempoEngine({
      bpm: 90,
      sampleRate: 44_100,
      timeSignature: "7/8",
    });
    const intervalMs = engine.intervalMs;
    const lastBeatInBar = engine.positionAtElapsedMs(intervalMs * 6);
    const firstBeatNextBar = engine.positionAtElapsedMs(intervalMs * 7);

    expect(engine.beatsPerBar).toBe(7);
    expect(lastBeatInBar.barNumber).toBe(1);
    expect(lastBeatInBar.beatInBar).toBe(7);
    expect(firstBeatNextBar.barNumber).toBe(2);
    expect(firstBeatNextBar.beatInBar).toBe(1);
  });

  it("matches sample-domain position to millisecond position", () => {
    const bpm = 100;
    const sampleRate = 44_100;
    const samples = samplesPerBeatFromBpm(bpm, sampleRate);
    const fromSamples = beatsElapsedFromSamples(samples * 3, bpm, sampleRate);
    const fromMs = beatsElapsedFromMs(intervalMsFromBpm(bpm) * 3, bpm);

    expect(fromSamples).toBeCloseTo(3, 8);
    expect(fromMs).toBeCloseTo(3, 8);
    expect(fromSamples).toBeCloseTo(fromMs, 8);
  });

  it("stays stable on exact bar boundaries", () => {
    const beatsPerBar = 3;
    const position = positionFromBeatsElapsed(beatsPerBar, beatsPerBar);
    expect(position.barNumber).toBe(2);
    expect(position.beatInBar).toBe(1);
    expect(position.beatNumber).toBe(4);
  });

  it("rejects negative elapsed time and sample indexes", () => {
    expect(() => beatsElapsedFromMs(-1, 120)).toThrow(/non-negative/);
    expect(() => beatsElapsedFromSamples(-8, 120, 44_100)).toThrow(
      /non-negative/,
    );
    expect(() => positionFromBeatsElapsed(1, 0)).toThrow(/positive integer/);
  });
});
