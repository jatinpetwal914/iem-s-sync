import { describe, expect, it } from "vitest";
import { sectionAtSongBar } from "@/features/songs/section-progress";
import type { PerformanceSection } from "@/features/songs/section-kinds";

function section(
  partial: Pick<PerformanceSection, "id" | "title" | "startBar" | "sortOrder">,
): PerformanceSection {
  return {
    songId: "song",
    teamId: "team",
    kind: "verse",
    bars: null,
    lyrics: null,
    chords: null,
    lyricCues: [],
    ...partial,
  };
}

describe("sectionAtSongBar", () => {
  it("returns the latest section that has started", () => {
    const sections = [
      section({ id: "intro", title: "Intro", startBar: 1, sortOrder: 0 }),
      section({ id: "chorus", title: "Chorus", startBar: 5, sortOrder: 1 }),
    ];
    expect(sectionAtSongBar(sections, 1)?.id).toBe("intro");
    expect(sectionAtSongBar(sections, 5)?.id).toBe("chorus");
    expect(sectionAtSongBar(sections, 12)?.id).toBe("chorus");
  });

  it("returns null when there are no sections", () => {
    expect(sectionAtSongBar([], 4)).toBeNull();
  });
});
