export type Bpm = number;
export type Bps = number;
export type IntervalMs = number;
export type SampleRate = number;
export type SamplesPerBeat = number;
export type BeatNumber = number;
export type BarNumber = number;
export type BeatInBar = number;
export type BeatsElapsed = number;

export type TimeSignature = {
  numerator: number;
  denominator: number;
};

export type TempoSnapshot = {
  bpm: Bpm;
  bps: Bps;
  beatsPerSecond: Bps;
  intervalMs: IntervalMs;
  sampleRate: SampleRate;
  samplesPerBeat: SamplesPerBeat;
  timeSignature: TimeSignature;
};

export type TempoPosition = {
  beatsElapsed: BeatsElapsed;
  beatNumber: BeatNumber;
  barNumber: BarNumber;
  beatInBar: BeatInBar;
};

export type TempoEngineOptions = {
  bpm: number;
  sampleRate: number;
  timeSignature?: TimeSignature | string;
};

export type TempoParseResult<T> =
  | { ok: true; value: T; issues: [] }
  | { ok: false; value: null; issues: string[] };
