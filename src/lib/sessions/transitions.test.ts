import { describe, expect, it } from "vitest";
import {
  canTransition,
  computePlayStartAt,
  computeResumeStartAt,
  beatsElapsedAt,
} from "@/lib/sessions/transitions";
import { START_AT_LEAD_MS } from "@/lib/sync/constants";

describe("session transitions", () => {
  it("allows the documented transport graph", () => {
    expect(canTransition("stopped", "play")).toBe(true);
    expect(canTransition("playing", "pause")).toBe(true);
    expect(canTransition("paused", "resume")).toBe(true);
    expect(canTransition("playing", "stop")).toBe(true);
    expect(canTransition("paused", "stop")).toBe(true);
    expect(canTransition("stopped", "reset")).toBe(true);
    expect(canTransition("playing", "play")).toBe(false);
    expect(canTransition("paused", "play")).toBe(false);
    expect(canTransition("stopped", "pause")).toBe(false);
    expect(canTransition("playing", "resume")).toBe(false);
    expect(canTransition("stopped", "stop")).toBe(false);
  });

  it("creates a future play timestamp", () => {
    expect(computePlayStartAt(1000)).toBe(1000 + START_AT_LEAD_MS);
  });

  it("resumes from saved beats without restarting at beat 1", () => {
    const now = 20_000;
    const startAt = computeResumeStartAt(now, 3, 120);
    const elapsed = beatsElapsedAt(now + START_AT_LEAD_MS, startAt, 120);
    expect(elapsed).toBeCloseTo(3, 8);
  });
});
