export const PAST_BEAT_SLOP_SEC = 0.02;
export const DRIFT_HARD_RESYNC_SEC = 0.08;

export function originAudioTime(
  audioNow: number,
  wallNowMs: number,
  startAtMs: number,
): number {
  return audioNow + (startAtMs - wallNowMs) / 1000;
}

export function beatAudioTime(
  origin: number,
  beatIndex: number,
  intervalSec: number,
): number {
  return origin + beatIndex * intervalSec;
}

export function skipToUpcomingBeat(
  origin: number,
  audioNow: number,
  intervalSec: number,
  pastSlopSec = PAST_BEAT_SLOP_SEC,
): { beatIndex: number; noteTime: number } {
  let beatIndex = 0;
  let noteTime = origin;
  const horizon = audioNow - pastSlopSec;

  while (noteTime < horizon) {
    beatIndex += 1;
    noteTime += intervalSec;
  }

  return { beatIndex, noteTime };
}

export function needsHardResync(
  expectedNoteTime: number,
  scheduledNoteTime: number,
  thresholdSec = DRIFT_HARD_RESYNC_SEC,
): boolean {
  return Math.abs(expectedNoteTime - scheduledNoteTime) >= thresholdSec;
}
