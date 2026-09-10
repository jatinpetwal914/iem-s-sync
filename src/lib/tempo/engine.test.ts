import { describe, expect, it } from "vitest";
import {
  MILLISECONDS_PER_MINUTE,
  SECONDS_PER_MINUTE,
} from "@/lib/tempo/constants";
import {
  createTempoEngine,
  defaultTempoEngine,
  parseTempoEngineOptions,
} from "@/lib/tempo/engine";

describe("tempo engine", () => {
  it("exposes derived tempo fields without hardcoding results", () => {
    const bpm = 135;
    const sampleRate = 48_000;
    const engine = createTempoEngine({
      bpm,
      sampleRate,
      timeSignature: "3/4",
    });

    expect(engine.bps).toBe(bpm / SECONDS_PER_MINUTE);
    expect(engine.intervalMs).toBe(MILLISECONDS_PER_MINUTE / bpm);
    expect(engine.samplesPerBeat).toBe((sampleRate * SECONDS_PER_MINUTE) / bpm);
    expect(engine.beatsPerBar).toBe(3);
    expect(engine.timeSignature).toEqual({ numerator: 3, denominator: 4 });
  });

  it("does not import or require a React runtime", () => {
    const engine = defaultTempoEngine();
    const atBar = engine.positionAtElapsedMs(engine.intervalMs * 4);
    expect(atBar.barNumber).toBe(2);
    expect(engine.bpm).toBe(120);
  });

  it("fails closed when options are invalid", () => {
    expect(parseTempoEngineOptions({ bpm: 120, sampleRate: 44_100 }).ok).toBe(
      true,
    );
    expect(() =>
      createTempoEngine({ bpm: 0, sampleRate: 44_100 }),
    ).toThrow(/BPM/);
    expect(() =>
      createTempoEngine({ bpm: 120, sampleRate: 44_100, timeSignature: "4/5" }),
    ).toThrow(/denominator/);
  });
});
