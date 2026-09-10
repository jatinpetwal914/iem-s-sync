import {
  BPM_MAX,
  BPM_MIN,
  SAMPLE_RATE_MAX,
  SAMPLE_RATE_MIN,
} from "@/lib/tempo/constants";
import type { TempoParseResult } from "@/lib/tempo/types";

export function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function assertPositiveFinite(value: number, label: string): void {
  if (!isPositiveFinite(value)) {
    throw new Error(`${label} must be a positive finite number`);
  }
}

export function assertNonNegativeFinite(value: number, label: string): void {
  if (!isNonNegativeFinite(value)) {
    throw new Error(`${label} must be a non-negative finite number`);
  }
}

export function parseBpmInput(raw: string): TempoParseResult<number> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fail("BPM is required");
  }
  return parseBpm(Number(trimmed));
}

export function parseBpm(value: number): TempoParseResult<number> {
  if (!Number.isFinite(value)) {
    return fail("BPM must be a finite number");
  }
  if (value <= 0) {
    return fail("BPM must be greater than 0");
  }
  if (value < BPM_MIN || value > BPM_MAX) {
    return fail(`BPM must be between ${BPM_MIN} and ${BPM_MAX}`);
  }
  return ok(value);
}

export function parseSampleRate(value: number): TempoParseResult<number> {
  if (!Number.isFinite(value)) {
    return fail("Sample rate must be a finite number");
  }
  if (value <= 0) {
    return fail("Sample rate must be greater than 0");
  }
  if (value < SAMPLE_RATE_MIN || value > SAMPLE_RATE_MAX) {
    return fail(
      `Sample rate must be between ${SAMPLE_RATE_MIN} and ${SAMPLE_RATE_MAX}`,
    );
  }
  return ok(value);
}

export function requireParsed<T>(result: TempoParseResult<T>, fallbackLabel: string): T {
  if (!result.ok) {
    throw new Error(result.issues[0] ?? `${fallbackLabel} is invalid`);
  }
  return result.value;
}

function ok<T>(value: T): TempoParseResult<T> {
  return { ok: true, value, issues: [] };
}

function fail(issue: string): TempoParseResult<never> {
  return { ok: false, value: null, issues: [issue] };
}
