import {
  DEFAULT_LYRICS_SETTINGS,
  isLyricsEffect,
  isLyricsSpeed,
  isLyricsTransition,
  type LyricsSettings,
} from "@/lib/lyrics/types";

const PREFIX = "iem-lyrics:";

export function loadLyricsPrefs(teamId: string): LyricsSettings | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${teamId}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<LyricsSettings>;
    if (!parsed.effect || !isLyricsEffect(parsed.effect)) {
      return null;
    }
    return {
      ...DEFAULT_LYRICS_SETTINGS,
      ...parsed,
      effect: parsed.effect,
      transition:
        parsed.transition && isLyricsTransition(parsed.transition)
          ? parsed.transition
          : DEFAULT_LYRICS_SETTINGS.transition,
      speed:
        parsed.speed && isLyricsSpeed(parsed.speed)
          ? parsed.speed
          : DEFAULT_LYRICS_SETTINGS.speed,
      upcomingLines:
        parsed.upcomingLines === 1 || parsed.upcomingLines === 2 || parsed.upcomingLines === 3
          ? parsed.upcomingLines
          : DEFAULT_LYRICS_SETTINGS.upcomingLines,
      autoAdvance: parsed.autoAdvance ?? DEFAULT_LYRICS_SETTINGS.autoAdvance,
      highlight: parsed.highlight ?? DEFAULT_LYRICS_SETTINGS.highlight,
    };
  } catch {
    return null;
  }
}

export function saveLyricsPrefs(teamId: string, settings: LyricsSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`${PREFIX}${teamId}`, JSON.stringify(settings));
}

export function clearLyricsPrefs(teamId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(`${PREFIX}${teamId}`);
}
