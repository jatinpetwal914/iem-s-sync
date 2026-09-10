import { describe, expect, it } from "vitest";
import { buildMusicPrompt } from "@/lib/prompts/music-prompt";
import { createTempoSnapshot } from "@/lib/tempo/calculations";

describe("music prompt engine", () => {
  it("injects live tempo math instead of hardcoded values", () => {
    const tempo = createTempoSnapshot(124, 44100, "4/4");
    const prompt = buildMusicPrompt({
      userBpm: tempo.bpm,
      calculatedBps: tempo.bps,
      genre: "House",
      intervalMs: tempo.intervalMs,
      timeSignature: "4/4",
      pattern: [1, 0, 0, 0],
      sampleRate: tempo.sampleRate,
      samplesPerBeat: tempo.samplesPerBeat,
    });

    expect(prompt).toContain("124");
    expect(prompt).toContain(String(tempo.bps));
    expect(prompt).toContain(String(tempo.intervalMs));
    expect(prompt).toContain("House");
    expect(prompt).toContain("TARGET TEMPO");
    expect(prompt).not.toContain("TODO");
  });

  it("recalculates for 60 and 160 BPM", () => {
    for (const bpm of [60, 160]) {
      const tempo = createTempoSnapshot(bpm, 44100, "4/4");
      const prompt = buildMusicPrompt({
        userBpm: tempo.bpm,
        calculatedBps: tempo.bps,
        genre: "House",
        intervalMs: tempo.intervalMs,
        timeSignature: "4/4",
        pattern: [1, 0, 0, 0],
        sampleRate: tempo.sampleRate,
        samplesPerBeat: tempo.samplesPerBeat,
      });
      expect(prompt).toContain(String(bpm));
      expect(prompt).toContain(String(tempo.bps));
      expect(prompt).toContain(String(tempo.intervalMs));
    }
  });
});
