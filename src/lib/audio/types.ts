export type AudioEngineState =
  | "UNINITIALIZED"
  | "READY"
  | "PLAYING"
  | "PAUSED"
  | "STOPPED"
  | "ERROR";

export type ClickKind = "accent" | "normal";

export type AudioEngineSnapshot = {
  state: AudioEngineState;
  suspended: boolean;
  bpm: number;
  timeSignature: string;
  pattern: number[];
  nextBeatIndex: number;
  error: string | null;
};

export type TransportSession = {
  status: "stopped" | "playing" | "paused";
  startAt: string | number | null;
  bpm: number;
  timeSignature: string;
  pattern: number[];
  positionBeats: number;
  revision: number;
};

export type ApplySessionOptions = {
  /** Re-apply even when the revision did not increase (reconnect, tab wake, audio gate). */
  force?: boolean;
};

export type WallClock = {
  now: () => number;
};

export type AudioEngineOptions = {
  createContext?: () => CompatibleAudioContext;
  clock?: WallClock;
  lookaheadSec?: number;
  scheduleAheadSec?: number;
  schedulerIntervalMs?: number;
};

export type CompatibleAudioContext = Pick<
  AudioContext,
  | "currentTime"
  | "state"
  | "sampleRate"
  | "destination"
  | "createGain"
  | "createBuffer"
  | "createBufferSource"
  | "resume"
  | "suspend"
  | "close"
> & {
  addEventListener?(
    type: "statechange",
    listener: () => void,
  ): void;
  removeEventListener?(
    type: "statechange",
    listener: () => void,
  ): void;
};
