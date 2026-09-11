import { describe, expect, it } from "vitest";
import {
  beatAudioTime,
  needsHardResync,
  originAudioTime,
  skipToUpcomingBeat,
} from "@/lib/audio/timeline";

describe("shared timeline scheduling", () => {
  it("maps a future startAt onto AudioContext time", () => {
    expect(originAudioTime(10, 1_000, 1_450)).toBeCloseTo(10.45, 8);
  });

  it("places each beat on the shared timeline", () => {
    expect(beatAudioTime(10, 4, 0.5)).toBeCloseTo(12, 8);
  });

  it("skips beats that already passed for late join", () => {
    const origin = originAudioTime(10, 21_000, 1_000);
    const next = skipToUpcomingBeat(origin, 10, 0.5);
    expect(next.beatIndex).toBe(40);
    expect(next.noteTime).toBeGreaterThanOrEqual(10 - 0.02);
  });

  it("hard-resyncs only when phase error is large", () => {
    expect(needsHardResync(10.01, 10)).toBe(false);
    expect(needsHardResync(10.09, 10)).toBe(true);
  });
});
