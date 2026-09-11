import { describe, expect, it } from "vitest";
import { lyricViewFromTimeline, songElapsedMs } from "@/lib/lyrics/timing";
import { DEFAULT_LYRICS_SETTINGS } from "@/lib/lyrics/types";
import type { PerformanceSection } from "@/features/songs/section-kinds";
import type { PlaybackPosition } from "@/lib/sync/types";

function position(partial: Partial<PlaybackPosition>): PlaybackPosition {
  return {
    elapsedMs: 0,
    beatIndex: 0,
    barIndex: 0,
    beatNumber: 1,
    barNumber: 1,
    beatInBar: 1,
    phase: 0,
    isPlaying: true,
    isScheduled: false,
    ...partial,
  };
}

function verse(partial?: Partial<PerformanceSection>): PerformanceSection {
  return {
    id: "verse",
    songId: "song",
    teamId: "team",
    kind: "verse",
    title: "Verse 1",
    sortOrder: 0,
    startBar: 1,
    bars: 8,
    lyrics: "Line one\nLine two\nLine three",
    chords: "G",
    lyricCues: [],
    ...partial,
  };
}

describe("lyricViewFromTimeline", () => {
  it("keeps every line visible in static mode", () => {
    const view = lyricViewFromTimeline({
      section: verse(),
      sections: [verse()],
      position: position({ elapsedMs: 4000 }),
      bpm: 120,
      beatsPerBar: 4,
      countInBars: 0,
      settings: { ...DEFAULT_LYRICS_SETTINGS, effect: "static" },
    });
    expect(view.lines).toHaveLength(3);
    expect(view.lines.every((line) => line.state === "current")).toBe(true);
  });

  it("shows only the current line in line-by-line mode", () => {
    const view = lyricViewFromTimeline({
      section: verse(),
      sections: [verse()],
      position: position({ elapsedMs: 9000 }),
      bpm: 120,
      beatsPerBar: 4,
      countInBars: 0,
      settings: { ...DEFAULT_LYRICS_SETTINGS, effect: "line" },
    });
    expect(view.currentLineIndex).toBeGreaterThan(0);
    expect(view.lines.filter((line) => line.state === "current")).toHaveLength(1);
    expect(view.lines.some((line) => line.state === "hidden")).toBe(true);
  });

  it("dims past and upcoming lines in progressive mode", () => {
    const view = lyricViewFromTimeline({
      section: verse(),
      sections: [verse()],
      position: position({ elapsedMs: 9000 }),
      bpm: 120,
      beatsPerBar: 4,
      countInBars: 0,
      settings: {
        ...DEFAULT_LYRICS_SETTINGS,
        effect: "progressive",
        upcomingLines: 1,
      },
    });
    expect(view.lines[0]?.state).toBe("past");
    expect(view.lines[view.currentLineIndex]?.state).toBe("current");
    expect(view.lines.some((line) => line.state === "upcoming")).toBe(true);
  });

  it("highlights words in karaoke mode from authored timing", () => {
    const section = verse({
      lyricCues: [
        {
          text: "I found a love",
          startMs: 0,
          endMs: 4000,
          words: [
            { text: "I", startMs: 0, endMs: 1000 },
            { text: "found", startMs: 1000, endMs: 2000 },
            { text: "a", startMs: 2000, endMs: 3000 },
            { text: "love", startMs: 3000, endMs: 4000 },
          ],
        },
      ],
      lyrics: "I found a love",
    });
    const view = lyricViewFromTimeline({
      section,
      sections: [section],
      position: position({ elapsedMs: 1500 }),
      bpm: 120,
      beatsPerBar: 4,
      countInBars: 0,
      settings: { ...DEFAULT_LYRICS_SETTINGS, effect: "karaoke" },
    });
    expect(view.timed).toBe(true);
    expect(view.lines[0]?.words[1]?.active).toBe(true);
    expect(view.lines[0]?.words[0]?.done).toBe(true);
  });

  it("starts late join on the current line instead of line 1", () => {
    const view = lyricViewFromTimeline({
      section: verse(),
      sections: [verse()],
      position: position({ elapsedMs: 14000 }),
      bpm: 120,
      beatsPerBar: 4,
      countInBars: 0,
      settings: { ...DEFAULT_LYRICS_SETTINGS, effect: "line" },
    });
    expect(view.currentLineIndex).toBe(2);
    expect(view.currentLineText).toBe("Line three");
  });

  it("holds the paused line from the session position", () => {
    const view = lyricViewFromTimeline({
      section: verse(),
      sections: [verse()],
      position: position({ elapsedMs: 14000, isPlaying: false }),
      bpm: 120,
      beatsPerBar: 4,
      countInBars: 0,
      settings: { ...DEFAULT_LYRICS_SETTINGS, effect: "line" },
    });
    expect(view.currentLineText).toBe("Line three");
  });

  it("does not treat count-in as song time", () => {
    expect(
      songElapsedMs({
        position: position({ elapsedMs: 2000, isScheduled: false }),
        bpm: 120,
        beatsPerBar: 4,
        countInBars: 1,
      }),
    ).toBe(0);
  });
});
