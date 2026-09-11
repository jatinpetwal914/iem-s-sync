export const START_AT_LEAD_MS = 450;

export const SYNC_THRESHOLDS_MS = {
  excellentMaxRtt: 80,
  goodMaxRtt: 160,
  offlineAfterMs: 15_000,
} as const;

export const CLOCK_SAMPLE_COUNT = 5;
export const CLOCK_MAX_SAMPLE_RTT_MS = 800;
export const CLOCK_REANCHOR_MS = 25;
export const DEVICE_HEARTBEAT_MS = 4_000;
export const DISPLAY_FRAME_MS = 50;
