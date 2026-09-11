export { BeatAudioEngine, createBeatAudioEngine } from "@/lib/audio/engine";
export { requestPerformanceMic, micErrorMessage } from "@/lib/audio/mic";
export { VoiceRecorder, pickRecordingMimeType } from "@/lib/audio/recording";
export { createClickBuffer } from "@/lib/audio/clicks";
export {
  DEFAULT_MIXER,
  clampDb,
  clampPercent,
  percentToGain,
  rampGain,
} from "@/lib/audio/graph";
export type {
  MixerChannelId,
  MixerSnapshot,
  EqBand,
  EqChannelId,
} from "@/lib/audio/graph";
export type {
  AudioEngineOptions,
  AudioEngineSnapshot,
  AudioEngineState,
  CompatibleAudioContext,
  TransportSession,
  WallClock,
} from "@/lib/audio/types";
