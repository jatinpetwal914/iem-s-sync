export { getPlaybackPosition, startAtToEpochMs } from "@/lib/sync/playback-position";
export { getCountInView, COUNT_IN_OPTIONS } from "@/lib/sync/count-in";
export type { CountInBars, CountInView } from "@/lib/sync/count-in";
export {
  ClockSynchronizer,
  connectionLabel,
  sessionSyncLabel,
  syncQualityFromRtt,
} from "@/lib/sync/clock";
export type { ClockSample, ClockSnapshot, ServerTimeClient, SessionSyncLabel } from "@/lib/sync/clock";
export {
  shouldApplyRevision,
  isDuplicateRevision,
  isStaleRevision,
} from "@/lib/sync/revision";
export {
  sessionChannelName,
  presenceChannelName,
  membershipChannelName,
  performanceChannelName,
  monitorChannelName,
} from "@/lib/sync/channels";
export {
  CLOCK_MAX_SAMPLE_RTT_MS,
  CLOCK_REANCHOR_MS,
  CLOCK_SAMPLE_COUNT,
  DEVICE_HEARTBEAT_MS,
  DISPLAY_FRAME_MS,
  START_AT_LEAD_MS,
  SYNC_THRESHOLDS_MS,
} from "@/lib/sync/constants";
export { getOrCreateDeviceId, parseUserAgent } from "@/lib/sync/device";
export type {
  AppSessionStatus,
  PlaybackPosition,
  PlaybackPositionInput,
  SessionTransportStatus,
} from "@/lib/sync/types";
export { SessionRevisionGate } from "@/lib/sync/revision-gate";
