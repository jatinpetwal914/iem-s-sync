export {
  BPM_MAX,
  BPM_MIN,
  DEFAULT_BPM,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_TIME_SIGNATURE,
  MILLISECONDS_PER_MINUTE,
  SAMPLE_RATE_MAX,
  SAMPLE_RATE_MIN,
  SECONDS_PER_MINUTE,
} from "@/lib/tempo/constants";
export {
  beatIntervalMs,
  beatsPerSecond,
  bpsFromBpm,
  createTempoSnapshot,
  intervalMsFromBpm,
  samplesPerBeat,
  samplesPerBeatFromBpm,
} from "@/lib/tempo/calculations";
export {
  createTempoEngine,
  defaultTempoEngine,
  parseTempoEngineOptions,
} from "@/lib/tempo/engine";
export type { TempoEngine } from "@/lib/tempo/engine";
export {
  beatsElapsedFromMs,
  beatsElapsedFromSamples,
  positionFromBeatsElapsed,
} from "@/lib/tempo/position";
export { sessionTempoReadout, formatHz, formatMs, formatSamples } from "@/lib/tempo/format";
export {
  beatsPerBar,
  formatTimeSignature,
  parseTimeSignature,
} from "@/lib/tempo/time-signature";
export {
  parseBpm,
  parseBpmInput,
  parseSampleRate,
  isPositiveFinite,
} from "@/lib/tempo/validation";
export type {
  BarNumber,
  BeatInBar,
  BeatNumber,
  BeatsElapsed,
  Bpm,
  Bps,
  IntervalMs,
  SampleRate,
  SamplesPerBeat,
  TempoEngineOptions,
  TempoParseResult,
  TempoPosition,
  TempoSnapshot,
  TimeSignature,
} from "@/lib/tempo/types";
export {
  genres,
  getGenre,
  getRecommendedBpmRange,
  isBpmInRecommendedRange,
  findGenresForBpm,
} from "@/config/genres";
export type { Genre, GenreId } from "@/config/genres";
