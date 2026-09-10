export { getPlaybackPosition, startAtToEpochMs } from "@/lib/sync/playback-position";
export {
  ClockSynchronizer,
  connectionLabel,
  syncQualityFromRtt,
} from "@/lib/sync/clock";
export type { ClockSample, ClockSnapshot, ServerTimeClient } from "@/lib/sync/clock";
export {
  shouldApplyRevision,
  isDuplicateRevision,
  isStaleRevision,
} from "@/lib/sync/revision";
export {
  sessionChannelName,
  presenceChannelName,
  membershipChannelName,
} from "@/lib/sync/channels";
export { CLOCK_SAMPLE_COUNT, DEVICE_HEARTBEAT_MS, DISPLAY_FRAME_MS, START_AT_LEAD_MS, SYNC_THRESHOLDS_MS } from "@/lib/sync/constants";
export { getOrCreateDeviceId, parseUserAgent } from "@/lib/sync/device";
export type {
  AppSessionStatus,
  PlaybackPosition,
  PlaybackPositionInput,
  SessionTransportStatus,
} from "@/lib/sync/types";
export { SessionRevisionGate } from "@/lib/sync/revision-gate";
