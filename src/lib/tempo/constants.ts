/** Unit conversions only. Tempo values are always derived from BPM. */
export const SECONDS_PER_MINUTE = 60;
export const MILLISECONDS_PER_MINUTE = 60_000;

export const DEFAULT_SAMPLE_RATE = 44_100;
export const DEFAULT_TIME_SIGNATURE = "4/4";
/** Seed BPM for a new master session. Live playback always uses the session value. */
export const DEFAULT_BPM = 124;

/** Absolute engine bounds. Genre ranges are recommendations inside these. */
export const BPM_MIN = 1;
export const BPM_MAX = 10_000;

export const SAMPLE_RATE_MIN = 1;
export const SAMPLE_RATE_MAX = 384_000;

export const TIME_SIGNATURE_PART_MIN = 1;
export const TIME_SIGNATURE_PART_MAX = 32;
export const TIME_SIGNATURE_DENOMINATORS = [1, 2, 4, 8, 16, 32] as const;
