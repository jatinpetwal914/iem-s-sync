import { createTempoSnapshot } from "@/lib/tempo/calculations";
import { parseBpm, parseSampleRate } from "@/lib/tempo/validation";
import {
  beatsPerBar,
  parseTimeSignature,
} from "@/lib/tempo/time-signature";
import {
  beatsElapsedFromMs,
  beatsElapsedFromSamples,
  positionFromBeatsElapsed,
} from "@/lib/tempo/position";
import {
  DEFAULT_SAMPLE_RATE,
  DEFAULT_TIME_SIGNATURE,
} from "@/lib/tempo/constants";
import type {
  TempoEngineOptions,
  TempoParseResult,
  TempoPosition,
  TempoSnapshot,
  TimeSignature,
} from "@/lib/tempo/types";

export type TempoEngine = TempoSnapshot & {
  beatsPerBar: number;
  positionAtElapsedMs: (elapsedMs: number) => TempoPosition;
  positionAtSample: (sampleIndex: number) => TempoPosition;
};

export function parseTempoEngineOptions(
  options: TempoEngineOptions,
): TempoParseResult<{
  bpm: number;
  sampleRate: number;
  timeSignature: TimeSignature;
}> {
  const bpmResult = parseBpm(options.bpm);
  const sampleRateResult = parseSampleRate(options.sampleRate);
  const timeSignatureResult = parseTimeSignature(options.timeSignature);
  const issues = [
    ...(bpmResult.ok ? [] : bpmResult.issues),
    ...(sampleRateResult.ok ? [] : sampleRateResult.issues),
    ...(timeSignatureResult.ok ? [] : timeSignatureResult.issues),
  ];

  if (
    issues.length > 0 ||
    !bpmResult.ok ||
    !sampleRateResult.ok ||
    !timeSignatureResult.ok
  ) {
    return { ok: false, value: null, issues };
  }

  return {
    ok: true,
    value: {
      bpm: bpmResult.value,
      sampleRate: sampleRateResult.value,
      timeSignature: timeSignatureResult.value,
    },
    issues: [],
  };
}

export function createTempoEngine(options: TempoEngineOptions): TempoEngine {
  const parsed = parseTempoEngineOptions(options);
  if (!parsed.ok) {
    throw new Error(parsed.issues.join(" "));
  }

  const { bpm, sampleRate, timeSignature } = parsed.value;
  const snapshot = createTempoSnapshot(bpm, sampleRate, timeSignature);
  const barLength = beatsPerBar(timeSignature);

  return {
    ...snapshot,
    beatsPerBar: barLength,
    positionAtElapsedMs(elapsedMs: number) {
      return positionFromBeatsElapsed(
        beatsElapsedFromMs(elapsedMs, bpm),
        barLength,
      );
    },
    positionAtSample(sampleIndex: number) {
      return positionFromBeatsElapsed(
        beatsElapsedFromSamples(sampleIndex, bpm, sampleRate),
        barLength,
      );
    },
  };
}

export function defaultTempoEngine(): TempoEngine {
  return createTempoEngine({
    bpm: 120,
    sampleRate: DEFAULT_SAMPLE_RATE,
    timeSignature: DEFAULT_TIME_SIGNATURE,
  });
}
