import {
  DEFAULT_TIME_SIGNATURE,
  TIME_SIGNATURE_DENOMINATORS,
  TIME_SIGNATURE_PART_MAX,
  TIME_SIGNATURE_PART_MIN,
} from "@/lib/tempo/constants";
import type { TempoParseResult, TimeSignature } from "@/lib/tempo/types";

const TIME_SIGNATURE_PATTERN = /^([1-9]\d?)\/([1-9]\d?)$/;

export function parseTimeSignature(
  value: TimeSignature | string | null | undefined,
): TempoParseResult<TimeSignature> {
  if (value == null || value === "") {
    return parseTimeSignature(DEFAULT_TIME_SIGNATURE);
  }

  if (typeof value !== "string") {
    return validateParts(value.numerator, value.denominator);
  }

  const trimmed = value.trim();
  const match = TIME_SIGNATURE_PATTERN.exec(trimmed);
  if (!match) {
    return fail("Time signature must look like 4/4");
  }

  return validateParts(Number(match[1]), Number(match[2]));
}

export function formatTimeSignature(signature: TimeSignature): string {
  return `${signature.numerator}/${signature.denominator}`;
}

export function beatsPerBar(signature: TimeSignature): number {
  return signature.numerator;
}

function validateParts(
  numerator: number,
  denominator: number,
): TempoParseResult<TimeSignature> {
  const issues: string[] = [];

  if (!Number.isInteger(numerator) || numerator < TIME_SIGNATURE_PART_MIN) {
    issues.push("Time signature numerator must be a positive integer");
  } else if (numerator > TIME_SIGNATURE_PART_MAX) {
    issues.push(
      `Time signature numerator must be at most ${TIME_SIGNATURE_PART_MAX}`,
    );
  }

  if (!Number.isInteger(denominator)) {
    issues.push("Time signature denominator must be an integer");
  } else if (
    !TIME_SIGNATURE_DENOMINATORS.some((allowed) => allowed === denominator)
  ) {
    issues.push("Time signature denominator must be 1, 2, 4, 8, 16, or 32");
  }

  if (issues.length > 0) {
    return { ok: false, value: null, issues };
  }

  return {
    ok: true,
    value: { numerator, denominator },
    issues: [],
  };
}

function fail(issue: string): TempoParseResult<never> {
  return { ok: false, value: null, issues: [issue] };
}
