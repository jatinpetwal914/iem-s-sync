import type { GenreId } from "@/config/genres";

export type MusicPromptInput = {
  userBpm: number;
  calculatedBps: number;
  genre: string;
  intervalMs: number;
  timeSignature: string;
  pattern: number[];
  sampleRate?: number;
  samplesPerBeat?: number;
};

export function buildMusicPrompt(input: MusicPromptInput): string {
  const pattern = input.pattern.map((step, index) =>
    `Beat ${index + 1}: ${step === 1 ? "accent" : "normal"}`,
  );

  return [
    "TARGET TEMPO",
    `${input.userBpm} BPM`,
    "",
    "BEATS PER SECOND",
    `${input.calculatedBps}`,
    "",
    "GENRE ARCHITECTURE",
    input.genre,
    "",
    "AUDIO DRIVER CLOCK",
    `Interval ${input.intervalMs} ms`,
    input.sampleRate != null ? `Sample rate ${input.sampleRate} Hz` : null,
    input.samplesPerBeat != null ? `Samples per beat ${input.samplesPerBeat}` : null,
    "",
    "COMPOSITION BLUEPRINT",
    `Time signature ${input.timeSignature}`,
    `Pattern ${pattern.join(" · ")}`,
    "",
    "RHYTHM TRACK",
    "Generate a click-aligned rhythm bed that locks to the calculated interval.",
    "Do not drift from the master BPM. Place downbeats on accented pattern steps.",
    "",
    "MUSICAL APPLICATION",
    "Produce in-ear monitoring material that a live band can follow.",
    "",
    "AUDIO FIDELITY CONSTRAINTS",
    "Keep transients tight. Avoid swing unless the pattern encodes it.",
    "Do not change tempo. Do not add pickup bars that offset the master clock.",
  ]
    .filter((line) => line != null)
    .join("\n");
}

export function genreLabel(id: GenreId | string | null): string {
  return id ?? "Unspecified";
}
