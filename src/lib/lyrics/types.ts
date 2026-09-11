export type LyricsEffect = "static" | "line" | "karaoke" | "progressive";
export type LyricsTransition = "instant" | "smooth";
export type LyricsSpeed = "slow" | "normal" | "fast";

export type LyricWordCue = {
  text: string;
  startMs: number;
  endMs: number;
};

export type LyricLineCue = {
  text: string;
  startMs: number;
  endMs: number;
  words?: LyricWordCue[];
};

/**
 * Lyric cue times are milliseconds from the start of the current SECTION,
 * after count-in. They are not wall-clock times and are not beat numbers.
 */
export type LyricsSettings = {
  effect: LyricsEffect;
  transition: LyricsTransition;
  autoAdvance: boolean;
  highlight: boolean;
  upcomingLines: 1 | 2 | 3;
  speed: LyricsSpeed;
};

export const DEFAULT_LYRICS_SETTINGS: LyricsSettings = {
  effect: "static",
  transition: "smooth",
  autoAdvance: true,
  highlight: true,
  upcomingLines: 2,
  speed: "normal",
};

export const LYRICS_EFFECT_OPTIONS: { id: LyricsEffect; label: string }[] = [
  { id: "static", label: "Static" },
  { id: "line", label: "Line by line" },
  { id: "karaoke", label: "Karaoke" },
  { id: "progressive", label: "Progressive" },
];

export function transitionMs(settings: LyricsSettings): number {
  if (settings.transition === "instant") {
    return 0;
  }
  if (settings.speed === "slow") {
    return 420;
  }
  if (settings.speed === "fast") {
    return 140;
  }
  return 280;
}

export function isLyricsEffect(value: string): value is LyricsEffect {
  return value === "static" || value === "line" || value === "karaoke" || value === "progressive";
}

export function isLyricsTransition(value: string): value is LyricsTransition {
  return value === "instant" || value === "smooth";
}

export function isLyricsSpeed(value: string): value is LyricsSpeed {
  return value === "slow" || value === "normal" || value === "fast";
}
