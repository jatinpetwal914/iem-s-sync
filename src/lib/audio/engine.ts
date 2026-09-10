import { intervalMsFromBpm } from "@/lib/tempo/calculations";
import { parseBpm, requireParsed } from "@/lib/tempo/validation";
import { beatsPerBar, parseTimeSignature } from "@/lib/tempo/time-signature";
import { createClickBuffer } from "@/lib/audio/clicks";
import { isAccentBeat } from "@/lib/sessions/pattern";
import { defaultBeatPattern } from "@/lib/sessions/pattern";
import { startAtToEpochMs } from "@/lib/sync/playback-position";
import type {
  ApplySessionOptions,
  AudioEngineOptions,
  AudioEngineSnapshot,
  AudioEngineState,
  CompatibleAudioContext,
  TransportSession,
  WallClock,
} from "@/lib/audio/types";
import { DEFAULT_BPM } from "@/lib/tempo/constants";

const DEFAULT_LOOKAHEAD_SEC = 0.12;
const DEFAULT_SCHEDULER_INTERVAL_MS = 25;

type ScheduledSource = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

export class BeatAudioEngine {
  private state: AudioEngineState = "UNINITIALIZED";
  private context: CompatibleAudioContext | null = null;
  private masterGain: GainNode | null = null;
  private accentBuffer: AudioBuffer | null = null;
  private normalBuffer: AudioBuffer | null = null;
  private bpm = DEFAULT_BPM;
  private timeSignature = "4/4";
  private pattern: number[] = defaultBeatPattern(4);
  private nextBeatIndex = 0;
  private nextNoteAudioTime = 0;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private error: string | null = null;
  private appliedRevision = -1;
  private lastSession: TransportSession | null = null;
  private visibilityHandler: (() => void) | null = null;
  private pageshowHandler: ((event: PageTransitionEvent) => void) | null = null;
  private stateHandler: (() => void) | null = null;
  private readonly listeners = new Set<(snapshot: AudioEngineSnapshot) => void>();
  private readonly scheduled = new Set<ScheduledSource>();
  private readonly createContext: () => CompatibleAudioContext;
  private readonly clock: WallClock;
  private readonly lookaheadSec: number;
  private readonly schedulerIntervalMs: number;

  constructor(options: AudioEngineOptions = {}) {
    this.createContext =
      options.createContext ??
      (() => new AudioContext() as CompatibleAudioContext);
    this.clock = options.clock ?? { now: () => Date.now() };
    this.lookaheadSec =
      options.lookaheadSec ?? options.scheduleAheadSec ?? DEFAULT_LOOKAHEAD_SEC;
    this.schedulerIntervalMs =
      options.schedulerIntervalMs ?? DEFAULT_SCHEDULER_INTERVAL_MS;
  }

  getSnapshot(): AudioEngineSnapshot {
    return {
      state: this.state,
      suspended: this.context?.state === "suspended",
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      pattern: [...this.pattern],
      nextBeatIndex: this.nextBeatIndex,
      error: this.error,
    };
  }

  subscribe(listener: (snapshot: AudioEngineSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  initialize(): AudioEngineSnapshot {
    if (this.state !== "UNINITIALIZED" && this.state !== "ERROR") {
      return this.getSnapshot();
    }

    try {
      this.context = this.createContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.context.destination);
      this.accentBuffer = createClickBuffer(this.context, "accent");
      this.normalBuffer = createClickBuffer(this.context, "normal");
      this.attachLifecycle();
      this.state = this.context.state === "running" ? "READY" : "READY";
      this.error = null;
      this.emit();
      return this.getSnapshot();
    } catch (error) {
      this.state = "ERROR";
      this.error =
        error instanceof Error ? error.message : "Audio engine failed to initialize";
      this.emit();
      return this.getSnapshot();
    }
  }

  async activate(): Promise<AudioEngineSnapshot> {
    if (this.state === "UNINITIALIZED" || this.context == null) {
      this.initialize();
    }
    if (!this.context) {
      return this.getSnapshot();
    }

    try {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      if (this.state === "UNINITIALIZED" || this.state === "ERROR") {
        this.state = "READY";
      }
      this.error = null;
      this.emit();
      return this.getSnapshot();
    } catch (error) {
      this.state = "ERROR";
      this.error =
        error instanceof Error ? error.message : "Audio activation was blocked";
      this.emit();
      return this.getSnapshot();
    }
  }

  async resumeAudio(): Promise<AudioEngineSnapshot> {
    return this.activate();
  }

  setBpm(bpm: number): void {
    this.bpm = requireParsed(parseBpm(bpm), "BPM");
    this.emit();
  }

  setTimeSignature(value: string): void {
    const parsed = parseTimeSignature(value);
    if (!parsed.ok) {
      throw new Error(parsed.issues[0] ?? "Time signature is invalid");
    }
    this.timeSignature = `${parsed.value.numerator}/${parsed.value.denominator}`;
    const barLength = beatsPerBar(parsed.value);
    if (this.pattern.length !== barLength) {
      this.pattern = defaultBeatPattern(barLength);
    }
    this.emit();
  }

  setPattern(pattern: number[]): void {
    if (pattern.length < 1 || pattern.some((step) => step !== 0 && step !== 1)) {
      throw new Error("Beat pattern is invalid");
    }
    this.pattern = [...pattern];
    this.emit();
  }

  start(session: Pick<TransportSession, "startAt" | "bpm" | "timeSignature" | "pattern">): void {
    if (!this.context || this.state === "UNINITIALIZED") {
      throw new Error("Activate the PlayBox before playback");
    }

    this.stopScheduler();
    this.stopScheduled();
    this.setBpm(session.bpm);
    this.setTimeSignature(session.timeSignature);
    this.setPattern(session.pattern);

    const startAtMs = startAtToEpochMs(session.startAt);
    if (startAtMs == null) {
      throw new Error("Playback requires a master start timestamp");
    }

    const wallNow = this.clock.now();
    const audioNow = this.context.currentTime;
    const startAudioTime = audioNow + (startAtMs - wallNow) / 1000;
    const intervalSec = intervalMsFromBpm(this.bpm) / 1000;
    let beatIndex = 0;
    let noteTime = startAudioTime;
    const horizon = audioNow - 0.02;

    while (noteTime < horizon) {
      beatIndex += 1;
      noteTime += intervalSec;
    }

    this.nextBeatIndex = beatIndex;
    this.nextNoteAudioTime = noteTime;
    this.state = "PLAYING";
    this.error = null;
    this.emit();
    this.armScheduler();
    this.schedulerTick();
  }

  pause(): void {
    this.stopScheduler();
    this.stopScheduled();
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
    }
    this.emit();
  }

  resume(session: Pick<TransportSession, "startAt" | "bpm" | "timeSignature" | "pattern">): void {
    this.start(session);
  }

  stop(): void {
    this.stopScheduler();
    this.stopScheduled();
    this.nextBeatIndex = 0;
    this.nextNoteAudioTime = 0;
    this.state = "STOPPED";
    this.emit();
  }

  reset(): void {
    this.stop();
  }

  async destroy(): Promise<void> {
    this.stopScheduler();
    this.stopScheduled();
    this.detachLifecycle();
    this.listeners.clear();
    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }
    this.context = null;
    this.masterGain = null;
    this.accentBuffer = null;
    this.normalBuffer = null;
    this.state = "UNINITIALIZED";
    this.appliedRevision = -1;
    this.lastSession = null;
  }

  applySession(session: TransportSession, options: ApplySessionOptions = {}): void {
    if (!options.force && session.revision <= this.appliedRevision) {
      return;
    }
    this.appliedRevision = session.revision;
    this.lastSession = {
      ...session,
      pattern: [...session.pattern],
    };
    this.setBpm(session.bpm);
    this.setTimeSignature(session.timeSignature);
    this.setPattern(session.pattern);

    if (session.status === "playing") {
      if (session.startAt == null) {
        this.stop();
        return;
      }
      try {
        this.start(session);
      } catch (error) {
        this.state = "ERROR";
        this.error =
          error instanceof Error ? error.message : "Could not start playback";
        this.emit();
      }
      return;
    }
    if (session.status === "paused") {
      this.pause();
      return;
    }
    this.stop();
  }

  private beatsPerBar(): number {
    const parsed = parseTimeSignature(this.timeSignature);
    if (!parsed.ok) {
      return 4;
    }
    return beatsPerBar(parsed.value);
  }

  private schedulerTick(): void {
    if (this.state !== "PLAYING" || !this.context) {
      return;
    }

    const intervalSec = intervalMsFromBpm(this.bpm) / 1000;
    const barLength = this.beatsPerBar();
    const horizon = this.context.currentTime + this.lookaheadSec;

    while (this.nextNoteAudioTime < horizon) {
      const beatInBar = (this.nextBeatIndex % barLength) + 1;
      const accent = isAccentBeat(this.pattern, beatInBar);
      this.scheduleClick(this.nextNoteAudioTime, accent);
      this.nextBeatIndex += 1;
      this.nextNoteAudioTime += intervalSec;
    }

    this.armScheduler();
  }

  private scheduleClick(audioTime: number, accent: boolean): void {
    if (!this.context || !this.masterGain) {
      return;
    }
    if (audioTime < this.context.currentTime - 0.01) {
      return;
    }

    const buffer = accent ? this.accentBuffer : this.normalBuffer;
    if (!buffer) {
      return;
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(audioTime);
    const scheduled: ScheduledSource = { source, gain };
    this.scheduled.add(scheduled);
    source.addEventListener?.("ended", () => {
      this.scheduled.delete(scheduled);
      try {
        source.disconnect();
        gain.disconnect();
      } catch {
        // already disconnected
      }
    });
  }

  private armScheduler(): void {
    this.clearSchedulerTimer();
    if (this.state !== "PLAYING") {
      return;
    }
    this.schedulerTimer = setTimeout(() => {
      this.schedulerTick();
    }, this.schedulerIntervalMs);
  }

  private stopScheduler(): void {
    this.clearSchedulerTimer();
  }

  private clearSchedulerTimer(): void {
    if (this.schedulerTimer != null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private stopScheduled(): void {
    for (const item of this.scheduled) {
      try {
        item.source.stop();
        item.source.disconnect();
        item.gain.disconnect();
      } catch {
        // already stopped
      }
    }
    this.scheduled.clear();
  }

  handleBackground(): void {
    this.stopScheduler();
    this.stopScheduled();
    this.emit();
  }

  async handleForeground(): Promise<void> {
    if (this.state === "UNINITIALIZED" || this.state === "ERROR") {
      return;
    }
    await this.activate();
    const session = this.lastSession;
    if (session?.status === "playing" && session.startAt != null) {
      this.start(session);
    }
    this.emit();
  }

  private attachLifecycle(): void {
    if (typeof document !== "undefined") {
      this.visibilityHandler = () => {
        if (document.visibilityState === "visible") {
          void this.handleForeground();
        } else {
          this.handleBackground();
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
    if (typeof window !== "undefined") {
      this.pageshowHandler = (event: PageTransitionEvent) => {
        if (event.persisted) {
          void this.handleForeground();
        }
      };
      window.addEventListener("pageshow", this.pageshowHandler);
    }

    if (this.context?.addEventListener) {
      this.stateHandler = () => this.emit();
      this.context.addEventListener("statechange", this.stateHandler);
    }
  }

  private detachLifecycle(): void {
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    if (this.pageshowHandler && typeof window !== "undefined") {
      window.removeEventListener("pageshow", this.pageshowHandler);
    }
    if (this.context?.removeEventListener && this.stateHandler) {
      this.context.removeEventListener("statechange", this.stateHandler);
    }
    this.visibilityHandler = null;
    this.pageshowHandler = null;
    this.stateHandler = null;
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export function createBeatAudioEngine(options?: AudioEngineOptions): BeatAudioEngine {
  return new BeatAudioEngine(options);
}
