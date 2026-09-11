import { describe, expect, it, vi } from "vitest";
import { BeatAudioEngine } from "@/lib/audio/engine";
import type { CompatibleAudioContext } from "@/lib/audio/types";

class FakeParam {
  value = 1;
  ramps: number[] = [];
  setValueAtTime(next: number) {
    this.value = next;
  }
  linearRampToValueAtTime(next: number) {
    this.value = next;
    this.ramps.push(next);
  }
  cancelScheduledValues() {}
  exponentialRampToValueAtTime() {}
}

class FakeNode {
  connect() {
    return this;
  }
  disconnect() {}
}

class FakeBiquad extends FakeNode {
  type: BiquadFilterType = "peaking";
  frequency = new FakeParam();
  Q = new FakeParam();
  gain = new FakeParam();
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

  createBiquadFilter() {
    return new FakeBiquad() as unknown as BiquadFilterNode;
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

  it("ramps mixer gains without recreating the graph", async () => {
    const context = new FakeContext();
    context.state = "running";
    const engine = new BeatAudioEngine({
      createContext: () => context,
      clock: { now: () => 2_000 },
    });
    await engine.activate();
    engine.setChannelGain("sync", 40);
    engine.setEq("sync", "low", 6);
    expect(engine.getSnapshot().mixer.sync).toBe(40);
    expect(engine.getSnapshot().mixer.eq.sync.low).toBe(6);
    engine.setMonitorMute(true);
    expect(engine.getSnapshot().mixer.monitorMute).toBe(true);
  });

  it("does not restart the scheduler when only the pattern revision changes", async () => {
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
      revision: 20,
    });
    const firstBatch = context.sources.length;
    engine.applySession({
      status: "playing",
      startAt: 2_000,
      bpm: 120,
      timeSignature: "4/4",
      pattern: [1, 1, 0, 0],
      positionBeats: 0,
      revision: 21,
    });
    expect(context.sources.slice(0, firstBatch).every((source) => source.stopped)).toBe(
      false,
    );
    expect(engine.getSnapshot().pattern).toEqual([1, 1, 0, 0]);
    await engine.destroy();
  });

  it("re-anchors from startAt when the synchronized clock jumps", async () => {
    vi.useFakeTimers();
    try {
      const context = new FakeContext();
      context.state = "running";
      let now = 2_000;
      const engine = new BeatAudioEngine({
        createContext: () => context,
        clock: { now: () => now },
        schedulerIntervalMs: 25,
        lookaheadSec: 0.05,
      });
      await engine.activate();
      engine.start({
        startAt: 2_000,
        bpm: 120,
        timeSignature: "4/4",
        pattern: [1, 0, 0, 0],
      });
      const firstBatch = context.sources.length;
      const indexBefore = engine.getSnapshot().nextBeatIndex;
      expect(firstBatch).toBeGreaterThan(0);

      now = 3_000;
      await vi.advanceTimersByTimeAsync(25);

      expect(context.sources.slice(0, firstBatch).every((source) => source.stopped)).toBe(
        true,
      );
      expect(engine.getSnapshot().nextBeatIndex).toBeGreaterThan(indexBefore);
      await engine.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
