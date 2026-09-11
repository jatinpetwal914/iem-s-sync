import { intervalMsFromBpm } from "@/lib/tempo/calculations";
import type { PlaybackPosition } from "@/lib/sync/types";
import type { PerformanceSection } from "@/features/songs/section-kinds";
import {
  estimateLineCues,
  parseLyricCues,
  splitLyricLines,
  wordsForLine,
} from "@/lib/lyrics/cues";
import type {
  LyricLineCue,
  LyricWordCue,
  LyricsSettings,
} from "@/lib/lyrics/types";

export type LyricWordView = LyricWordCue & {
  done: boolean;
  active: boolean;
};

export type LyricLineView = {
  text: string;
  state: "past" | "current" | "upcoming" | "hidden";
  words: LyricWordView[];
};

export type LyricTimelineView = {
  timed: boolean;
  currentLineIndex: number;
  currentLineText: string;
  highlightRatio: number;
  lines: LyricLineView[];
};

export function songElapsedMs(input: {
  position: PlaybackPosition;
  bpm: number;
  beatsPerBar: number;
  countInBars: number;
}): number {
  if (input.position.isScheduled) {
    return 0;
  }
  const interval = intervalMsFromBpm(input.bpm);
  const countInMs = Math.max(0, input.countInBars) * input.beatsPerBar * interval;
  return Math.max(0, input.position.elapsedMs - countInMs);
}

export function sectionElapsedMs(input: {
  position: PlaybackPosition;
  bpm: number;
  beatsPerBar: number;
  countInBars: number;
  sectionStartBar: number;
}): number {
  const songMs = songElapsedMs(input);
  const sectionStartMs =
    Math.max(0, input.sectionStartBar - 1) * input.beatsPerBar * intervalMsFromBpm(input.bpm);
  return songMs - sectionStartMs;
}

export function sectionDurationMs(
  section: PerformanceSection,
  sections: PerformanceSection[],
  bpm: number,
  beatsPerBar: number,
): number {
  const interval = intervalMsFromBpm(bpm);
  if (section.bars && section.bars > 0) {
    return section.bars * beatsPerBar * interval;
  }
  const next = [...sections]
    .filter((entry) => entry.songId === section.songId)
    .sort((a, b) => a.startBar - b.startBar || a.sortOrder - b.sortOrder)
    .find((entry) => entry.startBar > section.startBar);
  if (next) {
    return Math.max(1, next.startBar - section.startBar) * beatsPerBar * interval;
  }
  return 8 * beatsPerBar * interval;
}

export function resolveLineCues(
  section: PerformanceSection | null,
  sections: PerformanceSection[],
  bpm: number,
  beatsPerBar: number,
): { cues: LyricLineCue[]; timed: boolean } {
  if (!section) {
    return { cues: [], timed: false };
  }
  const lines = splitLyricLines(section.lyrics);
  const authored = parseLyricCues(section.lyricCues, lines);
  if (authored.length > 0) {
    return { cues: authored, timed: true };
  }
  return {
    cues: estimateLineCues(
      lines,
      sectionDurationMs(section, sections, bpm, beatsPerBar),
    ),
    timed: false,
  };
}

export function lyricViewFromTimeline(input: {
  section: PerformanceSection | null;
  sections: PerformanceSection[];
  position: PlaybackPosition;
  bpm: number;
  beatsPerBar: number;
  countInBars: number;
  settings: LyricsSettings;
}): LyricTimelineView {
  const { cues, timed } = resolveLineCues(
    input.section,
    input.sections,
    input.bpm,
    input.beatsPerBar,
  );
  if (cues.length === 0) {
    return {
      timed,
      currentLineIndex: 0,
      currentLineText: "",
      highlightRatio: 0,
      lines: [],
    };
  }

  const elapsed = input.settings.autoAdvance
    ? sectionElapsedMs({
        position: input.position,
        bpm: input.bpm,
        beatsPerBar: input.beatsPerBar,
        countInBars: input.countInBars,
        sectionStartBar: input.section?.startBar ?? 1,
      })
    : 0;

  let currentLineIndex = 0;
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    if (cue && elapsed >= cue.startMs) {
      currentLineIndex = index;
    }
  }

  const current = cues[currentLineIndex];
  const span = Math.max(1, (current?.endMs ?? 1) - (current?.startMs ?? 0));
  const highlightRatio = current
    ? clamp01((elapsed - current.startMs) / span)
    : 0;

  const upcomingLimit = input.settings.upcomingLines;
  const lines: LyricLineView[] = cues.map((cue, index) => {
    const words = wordsForLine(cue).map((word) => ({
      ...word,
      done: elapsed >= word.endMs,
      active: elapsed >= word.startMs && elapsed < word.endMs,
    }));
    return {
      text: cue.text,
      state: lineState(index, currentLineIndex, upcomingLimit, input.settings),
      words,
    };
  });

  return {
    timed,
    currentLineIndex,
    currentLineText: current?.text ?? "",
    highlightRatio,
    lines,
  };
}

function lineState(
  index: number,
  current: number,
  upcomingLimit: number,
  settings: LyricsSettings,
): LyricLineView["state"] {
  if (!settings.autoAdvance || settings.effect === "static") {
    return "current";
  }
  if (settings.effect === "line") {
    return index === current ? "current" : "hidden";
  }
  if (index < current) {
    return "past";
  }
  if (index === current) {
    return "current";
  }
  if (index <= current + upcomingLimit) {
    return "upcoming";
  }
  return "hidden";
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
