import type { Json } from "@/types/database";
import type { LyricLineCue, LyricWordCue } from "@/lib/lyrics/types";

export function splitLyricLines(lyrics: string | null | undefined): string[] {
  return (lyrics ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function parseLyricCues(raw: unknown, fallbackLines: string[]): LyricLineCue[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const cues: LyricLineCue[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const entry = raw[index];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as {
      text?: unknown;
      startMs?: unknown;
      endMs?: unknown;
      words?: unknown;
    };
    const text =
      typeof record.text === "string" && record.text.trim()
        ? record.text.trim()
        : fallbackLines[index] ?? "";
    const startMs = Number(record.startMs);
    const endMs = Number(record.endMs);
    if (!text || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      continue;
    }
    const words = parseWordCues(record.words);
    cues.push({
      text,
      startMs: Math.max(0, startMs),
      endMs: Math.max(startMs, endMs),
      words: words.length > 0 ? words : undefined,
    });
  }
  return cues;
}

function parseWordCues(raw: unknown): LyricWordCue[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const words: LyricWordCue[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as { text?: unknown; startMs?: unknown; endMs?: unknown };
    const text = typeof record.text === "string" ? record.text.trim() : "";
    const startMs = Number(record.startMs);
    const endMs = Number(record.endMs);
    if (!text || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      continue;
    }
    words.push({
      text,
      startMs: Math.max(0, startMs),
      endMs: Math.max(startMs, endMs),
    });
  }
  return words;
}

export function lyricCuesToJson(cues: LyricLineCue[]): Json {
  return cues.map((cue) => ({
    text: cue.text,
    startMs: cue.startMs,
    endMs: cue.endMs,
    words: cue.words?.map((word) => ({
      text: word.text,
      startMs: word.startMs,
      endMs: word.endMs,
    })),
  }));
}

export function estimateLineCues(
  lines: string[],
  sectionDurationMs: number,
): LyricLineCue[] {
  if (lines.length === 0) {
    return [];
  }
  const duration = Math.max(1000, sectionDurationMs);
  const each = duration / lines.length;
  return lines.map((text, index) => ({
    text,
    startMs: index * each,
    endMs: (index + 1) * each,
  }));
}

export function wordsForLine(cue: LyricLineCue): LyricWordCue[] {
  if (cue.words && cue.words.length > 0) {
    return cue.words;
  }
  const words = cue.text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const span = Math.max(1, cue.endMs - cue.startMs);
  const each = span / words.length;
  return words.map((text, index) => ({
    text,
    startMs: cue.startMs + index * each,
    endMs: cue.startMs + (index + 1) * each,
  }));
}

export function formatCueSeconds(cues: LyricLineCue[]): string {
  return cues
    .map((cue) => `${msToSec(cue.startMs)}-${msToSec(cue.endMs)}`)
    .join("\n");
}

export function parseCueSeconds(text: string, lines: string[]): LyricLineCue[] {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
  if (rows.length === 0) {
    return [];
  }
  const cues: LyricLineCue[] = [];
  for (let index = 0; index < Math.min(rows.length, lines.length); index += 1) {
    const match = rows[index]?.match(
      /^(-?\d+(?:\.\d+)?)\s*[-–to]+\s*(-?\d+(?:\.\d+)?)$/i,
    );
    if (!match) {
      continue;
    }
    const startMs = Math.max(0, Number(match[1]) * 1000);
    const endMs = Math.max(startMs, Number(match[2]) * 1000);
    const line = lines[index];
    if (!line) {
      continue;
    }
    cues.push({ text: line, startMs, endMs });
  }
  return cues;
}

function msToSec(ms: number): string {
  const value = ms / 1000;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
