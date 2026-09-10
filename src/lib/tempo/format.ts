import { createTempoSnapshot } from "@/lib/tempo/calculations";

export function formatHz(value: number, digits = 4): string {
  return `${value.toFixed(digits)} Hz`;
}

export function formatMs(value: number, digits = 2): string {
  return `${value.toFixed(digits)} ms`;
}

export function formatSamples(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function sessionTempoReadout(
  bpm: number,
  sampleRate: number,
  timeSignature: string,
) {
  const snapshot = createTempoSnapshot(bpm, sampleRate, timeSignature);
  return {
    bpm: snapshot.bpm,
    bps: snapshot.bps,
    intervalMs: snapshot.intervalMs,
    sampleRate: snapshot.sampleRate,
    samplesPerBeat: snapshot.samplesPerBeat,
    bpsLabel: formatHz(snapshot.bps),
    intervalLabel: formatMs(snapshot.intervalMs),
    samplesLabel: formatSamples(snapshot.samplesPerBeat),
  };
}
