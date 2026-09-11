import type { PerformanceSection } from "@/features/songs/section-kinds";

export function sectionAtSongBar(
  sections: PerformanceSection[],
  songBarNumber: number,
): PerformanceSection | null {
  if (sections.length === 0) {
    return null;
  }
  const sorted = [...sections].sort((a, b) => {
    if (a.startBar !== b.startBar) {
      return a.startBar - b.startBar;
    }
    return a.sortOrder - b.sortOrder;
  });
  let current = sorted[0] ?? null;
  for (const section of sorted) {
    if (section.startBar <= songBarNumber) {
      current = section;
    }
  }
  return current;
}
