import { describe, expect, it } from "vitest";
import { BeatAudioEngine } from "@/lib/audio/engine";
import type { CompatibleAudioContext } from "@/lib/audio/types";

class FakeParam {
  value = 1;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeNode {
  connect() {
    return this;
  }
  disconnect() {}
}

class FakeSource extends FakeNode {
  buffer: AudioBuffer | null = null;
  startedAt: number | null = null;
  stopped = false;
  start(time?: number) {
    this.startedAt = time ?? 0;
    this.stopped = false;
  }
  stop() {
    this.stopped = true;
  }
  addEventListener() {}
}

class FakeContext implements CompatibleAudioContext {
  currentTime = 10;
  state: AudioContextState = "suspended";
  sampleRate = 44100;
  destination = {} as AudioDestinationNode;
  sources: FakeSource[] = [];

  createGain() {
    const node = new FakeNode() as unknown as GainNode;
    (node as unknown as { gain: FakeParam }).gain = new FakeParam();
    return node;
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = [new Float32Array(length)];
    return {
      duration: length / sampleRate,
      numberOfChannels: channels,
      sampleRate,
      length,
      getChannelData: (index: number) => data[index] ?? data[0],
    } as AudioBuffer;
  }

  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }

  async resume() {
    this.state = "running";
  }

  async suspend() {
    this.state = "suspended";
  }

  async close() {
    this.state = "closed";
  }
}

describe("BeatAudioEngine", () => {
  it("requires activation and then becomes ready", async () => {
    const context = new FakeContext();
    const engine = new BeatAudioEngine({
      createContext: () => context,
      clock: { now: () => 1_000 },
    });

    expect(engine.getSnapshot().state).toBe("UNINITIALIZED");
    engine.initialize();
    expect(engine.getSnapshot().state).toBe("READY");
    await engine.activate();
    expect(context.state).toBe("running");
    expect(engine.getSnapshot().state).toBe("READY");
  });

  it("skips already-passed beats when starting late", async () => {
    const context = new FakeContext();
    context.state = "running";
    const engine = new BeatAudioEngine({
      createContext: () => context,
      clock: { now: () => 2_000 },
      schedulerIntervalMs: 10_000,
    });
    await engine.activate();
    engine.start({
      startAt: 1_000,
      bpm: 120,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
    });

    expect(engine.getSnapshot().state).toBe("PLAYING");
    expect(engine.getSnapshot().nextBeatIndex).toBeGreaterThan(0);
  });

  it("pauses, stops, resets, and ignores stale revisions", async () => {
    const context = new FakeContext();
    context.state = "running";
    const engine = new BeatAudioEngine({
      createContext: () => context,
      clock: { now: () => 5_000 },
    });
    await engine.activate();
    engine.applySession({
      status: "playing",
      startAt: 4_800,
      bpm: 100,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
      positionBeats: 0,
      revision: 2,
    });
    expect(engine.getSnapshot().state).toBe("PLAYING");
    engine.pause();
    expect(engine.getSnapshot().state).toBe("PAUSED");
    engine.stop();
    expect(engine.getSnapshot().state).toBe("STOPPED");
    engine.applySession({
      status: "playing",
      startAt: 4_800,
      bpm: 90,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
      positionBeats: 0,
      revision: 1,
    });
    expect(engine.getSnapshot().bpm).toBe(100);
    engine.reset();
    await engine.destroy();
    expect(engine.getSnapshot().state).toBe("UNINITIALIZED");
  });

  it("does not initialize twice into a new context", () => {
    const context = new FakeContext();
    const engine = new BeatAudioEngine({ createContext: () => context });
    engine.initialize();
    const first = engine.getSnapshot();
    engine.initialize();
    expect(engine.getSnapshot().state).toBe(first.state);
  });

  it("clears the previous scheduler when tempo changes while playing", async () => {
    const context = new FakeContext();
    context.state = "running";
    const engine = new BeatAudioEngine({
      createContext: () => context,
      clock: { now: () => 2_000 },
      schedulerIntervalMs: 10_000,
      lookaheadSec: 1,
    });
    await engine.activate();
    engine.applySession({
      status: "playing",
      startAt: 2_000,
      bpm: 120,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
      positionBeats: 0,
      revision: 4,
    });
    const firstBatch = context.sources.length;
    expect(firstBatch).toBeGreaterThan(0);

    engine.applySession({
      status: "playing",
      startAt: 2_000,
      bpm: 90,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
      positionBeats: 0,
      revision: 5,
    });

    const stoppedFirstBatch = context.sources
      .slice(0, firstBatch)
      .every((source) => source.stopped);
    expect(stoppedFirstBatch).toBe(true);
    expect(engine.getSnapshot().bpm).toBe(90);
    expect(engine.getSnapshot().state).toBe("PLAYING");
  });

  it("does not throw when a playing snapshot is missing startAt", async () => {
    const context = new FakeContext();
    context.state = "running";
    const engine = new BeatAudioEngine({
      createContext: () => context,
      clock: { now: () => 2_000 },
    });
    await engine.activate();
    expect(() =>
      engine.applySession({
        status: "playing",
        startAt: null,
        bpm: 120,
        timeSignature: "4/4",
        pattern: [1, 0, 0, 0],
        positionBeats: 0,
        revision: 8,
      }),
    ).not.toThrow();
    expect(engine.getSnapshot().state).toBe("STOPPED");
  });

  it("ignores duplicate revisions unless force is set", async () => {
    const context = new FakeContext();
    context.state = "running";
    const engine = new BeatAudioEngine({
      createContext: () => context,
      clock: { now: () => 2_000 },
      schedulerIntervalMs: 10_000,
    });
    await engine.activate();
    engine.applySession({
      status: "playing",
      startAt: 2_000,
      bpm: 120,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
      positionBeats: 0,
      revision: 12,
    });
    const afterFirst = context.sources.length;
    engine.applySession({
      status: "playing",
      startAt: 2_000,
      bpm: 120,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
      positionBeats: 0,
      revision: 12,
    });
    expect(context.sources.length).toBe(afterFirst);

    engine.applySession(
      {
        status: "playing",
        startAt: 1_000,
        bpm: 120,
        timeSignature: "4/4",
        pattern: [1, 0, 0, 0],
        positionBeats: 0,
        revision: 12,
      },
      { force: true },
    );
    expect(engine.getSnapshot().nextBeatIndex).toBeGreaterThan(0);
  });

  it("resynchronizes from startAt after a background/foreground cycle", async () => {
    const context = new FakeContext();
    context.state = "running";
    const engine = new BeatAudioEngine({
      createContext: () => context,
      clock: { now: () => 5_000 },
      schedulerIntervalMs: 10_000,
    });
    await engine.activate();
    engine.applySession({
      status: "playing",
      startAt: 1_000,
      bpm: 120,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
      positionBeats: 0,
      revision: 4,
    });
    const beforeHide = engine.getSnapshot().nextBeatIndex;
    expect(beforeHide).toBeGreaterThan(0);
    engine.handleBackground();
    await engine.handleForeground();
    expect(engine.getSnapshot().state).toBe("PLAYING");
    expect(engine.getSnapshot().nextBeatIndex).toBe(beforeHide);
  });
});
