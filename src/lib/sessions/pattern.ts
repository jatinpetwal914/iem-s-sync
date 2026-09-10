export function defaultBeatPattern(beatsPerBar: number): number[] {
  if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1) {
    throw new Error("Beats per bar must be a positive integer");
  }
  return Array.from({ length: beatsPerBar }, (_, index) => (index === 0 ? 1 : 0));
}

export function parseBeatPattern(
  value: string | null | undefined,
  beatsPerBar: number,
): number[] {
  const fallback = defaultBeatPattern(beatsPerBar);
  if (!value) {
    return fallback;
  }

  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== beatsPerBar || parts.some((part) => part !== 0 && part !== 1)) {
    return fallback;
  }
  return parts;
}

export function serializeBeatPattern(pattern: number[]): string {
  return pattern.map((step) => (step ? 1 : 0)).join(",");
}

export function isAccentBeat(pattern: number[], beatInBar: number): boolean {
  const step = pattern[beatInBar - 1];
  return step === 1;
}
