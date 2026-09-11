import type { PlaybackPosition } from "@/lib/sync/types";

export const COUNT_IN_OPTIONS = [0, 1, 2, 4] as const;
export type CountInBars = (typeof COUNT_IN_OPTIONS)[number];

export type CountInView = {
  active: boolean;
  remainingBeats: number;
  display: string | null;
  songBarNumber: number;
};

export function isCountInBars(value: number): value is CountInBars {
  return COUNT_IN_OPTIONS.includes(value as CountInBars);
}

export function getCountInView(
  position: PlaybackPosition,
  countInBars: number,
  beatsPerBar: number,
): CountInView {
  const bars = isCountInBars(countInBars) ? countInBars : 0;
  const barLength = Math.max(1, beatsPerBar);
  const countInBeats = bars * barLength;
  const songBarNumber = Math.max(1, position.barNumber - bars);

  if (bars <= 0 || (!position.isPlaying && !position.isScheduled)) {
    return {
      active: false,
      remainingBeats: 0,
      display: null,
      songBarNumber: position.barNumber,
    };
  }

  if (position.isScheduled) {
    return {
      active: true,
      remainingBeats: countInBeats,
      display: String(countInBeats),
      songBarNumber: 1,
    };
  }

  if (position.beatIndex < countInBeats) {
    const remainingBeats = countInBeats - position.beatIndex;
    return {
      active: true,
      remainingBeats,
      display: remainingBeats > 0 ? String(remainingBeats) : "PLAY",
      songBarNumber: 1,
    };
  }

  return {
    active: false,
    remainingBeats: 0,
    display: null,
    songBarNumber,
  };
}
