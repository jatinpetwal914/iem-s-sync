import { intervalMsFromBpm } from "@/lib/tempo/calculations";
import { parseBpm, requireParsed } from "@/lib/tempo/validation";
import { beatsPerBar, parseTimeSignature } from "@/lib/tempo/time-signature";
import { createClickBuffer } from "@/lib/audio/clicks";
import {
  DEFAULT_MIXER,
  applyEq,
  clampDb,
  clampPercent,
  createEqChain,
  effectiveChannelGain,
  percentToGain,
  rampGain,
  type EqBand,
  type EqChain,
  type EqChannelId,
  type MixerChannelId,
  type MixerSnapshot,
} from "@/lib/audio/graph";
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
import { micErrorMessage, requestPerformanceMic } from "@/lib/audio/mic";

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
  private syncChain: EqChain | null = null;
  private monitorChain: EqChain | null = null;
  private backingChain: EqChain | null = null;
  private monitorSource: MediaStreamAudioSourceNode | null = null;
  private monitorStream: MediaStream | null = null;
  private mixer: MixerSnapshot = emptyMixer();
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
      mixer: cloneMixer(this.mixer),
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
      this.syncChain = createEqChain(this.context);
      this.monitorChain = createEqChain(this.context);
      this.backingChain = createEqChain(this.context);
      this.syncChain.high.connect(this.masterGain);
      this.monitorChain.high.connect(this.masterGain);
      this.backingChain.high.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
      this.applyMixerGains(false);
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
    this.stopMonitor(false);
    this.listeners.clear();
    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }
    this.context = null;
    this.masterGain = null;
    this.syncChain = null;
    this.monitorChain = null;
    this.backingChain = null;
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

  setChannelGain(channel: MixerChannelId, percent: number): void {
    const value = clampPercent(percent);
    if (channel === "master") {
      this.mixer.master = value;
    } else if (channel === "sync") {
      this.mixer.sync = value;
    } else if (channel === "monitor") {
      this.mixer.monitor = value;
    } else {
      this.mixer.backing = value;
    }
    this.applyMixerGains(true);
    this.emit();
  }

  setEq(channel: EqChannelId, band: EqBand, db: number): void {
    this.mixer.eq[channel][band] = clampDb(db);
    const chain = this.chainFor(channel);
    if (chain) {
      applyEq(chain, this.mixer.eq[channel]);
    }
    this.emit();
  }

  setMonitorMute(muted: boolean): void {
    this.mixer.monitorMute = muted;
    this.applyMixerGains(true);
    this.emit();
  }

  setMonitorSolo(solo: boolean): void {
    this.mixer.monitorSolo = solo;
    this.applyMixerGains(true);
    this.emit();
  }

  applyLocalMixer(
    prefs: Omit<MixerSnapshot, "monitorEnabled" | "monitorError">,
  ): void {
    this.mixer = {
      ...this.mixer,
      ...prefs,
      eq: {
        sync: { ...prefs.eq.sync },
        monitor: { ...prefs.eq.monitor },
        backing: { ...prefs.eq.backing },
      },
    };
    this.applyMixerGains(false);
    if (this.syncChain) {
      applyEq(this.syncChain, this.mixer.eq.sync);
    }
    if (this.monitorChain) {
      applyEq(this.monitorChain, this.mixer.eq.monitor);
    }
    if (this.backingChain) {
      applyEq(this.backingChain, this.mixer.eq.backing);
    }
    this.emit();
  }

  async enableMonitor(): Promise<AudioEngineSnapshot> {
    if (this.mixer.monitorEnabled) {
      return this.getSnapshot();
    }
    if (!this.context || this.state === "UNINITIALIZED") {
      this.mixer.monitorError = "Activate the PlayBox before monitoring.";
      this.emit();
      return this.getSnapshot();
    }
    if (typeof this.context.createMediaStreamSource !== "function") {
      this.mixer.monitorError = "This browser cannot monitor a live input.";
      this.emit();
      return this.getSnapshot();
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      this.mixer.monitorError = "This browser cannot access a microphone.";
      this.emit();
      return this.getSnapshot();
    }

    try {
      const stream = await requestPerformanceMic();
      this.stopMonitor(false);
      this.monitorStream = stream;
      this.monitorSource = this.context.createMediaStreamSource(stream);
      if (this.monitorChain) {
        this.monitorSource.connect(this.monitorChain.gain);
      }
      this.mixer.monitorEnabled = true;
      this.mixer.monitorError = null;
      this.applyMixerGains(true);
      this.emit();
      return this.getSnapshot();
    } catch (error) {
      this.mixer.monitorEnabled = false;
      this.mixer.monitorError = micErrorMessage(error, "monitor");
      this.emit();
      return this.getSnapshot();
    }
  }

  disableMonitor(): AudioEngineSnapshot {
    this.stopMonitor(true);
    this.emit();
    return this.getSnapshot();
  }

  getMonitorStream(): MediaStream | null {
    return this.monitorStream;
  }

  async requestInputStream(): Promise<{ stream: MediaStream; owned: boolean }> {
    if (this.monitorStream) {
      return { stream: this.monitorStream, owned: false };
    }
    const stream = await requestPerformanceMic();
    return { stream, owned: true };
  }

  private scheduleClick(audioTime: number, accent: boolean): void {
    if (!this.context || !this.syncChain) {
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
    gain.connect(this.syncChain.gain);
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

  private applyMixerGains(smooth: boolean): void {
    if (!this.context) {
      return;
    }
    const solo = this.mixer.monitorSolo && this.mixer.monitorEnabled;
    const clock = this.context;
    const apply = (node: GainNode | undefined, value: number) => {
      if (!node) {
        return;
      }
      if (smooth) {
        rampGain(node, value, clock);
      } else {
        node.gain.value = value;
      }
    };

    apply(this.masterGain ?? undefined, percentToGain(this.mixer.master));
    apply(
      this.syncChain?.gain,
      effectiveChannelGain(this.mixer.sync, false, solo),
    );
    apply(
      this.monitorChain?.gain,
      this.mixer.monitorEnabled
        ? effectiveChannelGain(
            this.mixer.monitor,
            this.mixer.monitorMute,
            false,
          )
        : 0,
    );
    apply(
      this.backingChain?.gain,
      effectiveChannelGain(this.mixer.backing, false, solo),
    );
  }

  private chainFor(channel: EqChannelId): EqChain | null {
    if (channel === "sync") {
      return this.syncChain;
    }
    if (channel === "monitor") {
      return this.monitorChain;
    }
    return this.backingChain;
  }

  private stopMonitor(updateMixer: boolean): void {
    if (this.monitorSource) {
      try {
        this.monitorSource.disconnect();
      } catch {
        // already disconnected
      }
      this.monitorSource = null;
    }
    if (this.monitorStream) {
      for (const track of this.monitorStream.getTracks()) {
        track.stop();
      }
      this.monitorStream = null;
    }
    if (updateMixer) {
      this.mixer.monitorEnabled = false;
      this.mixer.monitorError = null;
      this.applyMixerGains(true);
    }
  }
}

export function createBeatAudioEngine(options?: AudioEngineOptions): BeatAudioEngine {
  return new BeatAudioEngine(options);
}

function emptyMixer(): MixerSnapshot {
  return {
    ...DEFAULT_MIXER,
    monitorEnabled: false,
    monitorError: null,
    eq: {
      sync: { ...DEFAULT_MIXER.eq.sync },
      monitor: { ...DEFAULT_MIXER.eq.monitor },
      backing: { ...DEFAULT_MIXER.eq.backing },
    },
  };
}

function cloneMixer(mixer: MixerSnapshot): MixerSnapshot {
  return {
    ...mixer,
    eq: {
      sync: { ...mixer.eq.sync },
      monitor: { ...mixer.eq.monitor },
      backing: { ...mixer.eq.backing },
    },
  };
}

