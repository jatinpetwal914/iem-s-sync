import { describe, expect, it } from "vitest";
import { bpsFromBpm, intervalMsFromBpm, samplesPerBeatFromBpm } from "@/lib/tempo/calculations";
import { getPlaybackPosition } from "@/lib/sync/playback-position";

describe("published tempo identities", () => {
  it("matches BPM 60", () => {
    expect(bpsFromBpm(60)).toBe(1);
    expect(intervalMsFromBpm(60)).toBe(1000);
  });

  it("matches BPM 120", () => {
    expect(bpsFromBpm(120)).toBe(2);
    expect(intervalMsFromBpm(120)).toBe(500);
  });

  it("matches BPM 124", () => {
    expect(bpsFromBpm(124)).toBeCloseTo(124 / 60, 12);
    expect(intervalMsFromBpm(124)).toBeCloseTo(60000 / 124, 12);
    expect(samplesPerBeatFromBpm(124, 44100)).toBeCloseTo((44100 * 60) / 124, 12);
  });
});

describe("getPlaybackPosition", () => {
  it("places a 300ms-late PLAY event at the current phase, not beat 1", () => {
    const startAt = 1_000_000;
    const position = getPlaybackPosition({
      startAt,
      now: startAt + 300,
      bpm: 120,
      timeSignature: "4/4",
      status: "playing",
    });

    expect(position.beatNumber).toBe(1);
    expect(position.phase).toBeCloseTo(0.6, 8);
    expect(position.barNumber).toBe(1);
  });

  it("does not restart at beat 1 when the event arrives 100ms late", () => {
    const startAt = 1_000_000;
    const position = getPlaybackPosition({
      startAt,
      now: startAt + 100,
      bpm: 120,
      timeSignature: "4/4",
      status: "playing",
    });

    expect(position.isPlaying).toBe(true);
    expect(position.beatIndex).toBe(0);
    expect(position.phase).toBeCloseTo(0.2, 8);
  });

  it("places a late joiner on the current bar and beat", () => {
    const startAt = 5_000_000;
    const interval = 60000 / 124;
    const elapsed = (11 * 4 + 2) * interval;
    const position = getPlaybackPosition({
      startAt,
      now: startAt + elapsed,
      bpm: 124,
      timeSignature: "4/4",
      status: "playing",
    });

    expect(position.barNumber).toBe(12);
    expect(position.beatInBar).toBe(3);
    expect(position.isPlaying).toBe(true);
  });

  it("keeps paused position instead of resetting", () => {
    const position = getPlaybackPosition({
      startAt: null,
      now: Date.now(),
      bpm: 120,
      timeSignature: "4/4",
      status: "paused",
      positionBeats: 7,
    });

    expect(position.isPlaying).toBe(false);
    expect(position.beatNumber).toBe(8);
    expect(position.barNumber).toBe(2);
    expect(position.beatInBar).toBe(4);
  });

  it("treats future startAt as scheduled, still not playing clicks yet", () => {
    const startAt = 10_000;
    const position = getPlaybackPosition({
      startAt,
      now: startAt - 200,
      bpm: 120,
      timeSignature: "4/4",
      status: "playing",
    });

    expect(position.isScheduled).toBe(true);
    expect(position.beatNumber).toBe(1);
    expect(position.elapsedMs).toBe(-200);
  });
});
