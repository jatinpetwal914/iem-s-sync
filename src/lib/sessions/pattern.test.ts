import { describe, expect, it } from "vitest";
import {
  defaultBeatPattern,
  parseBeatPattern,
  serializeBeatPattern,
  isAccentBeat,
} from "@/lib/sessions/pattern";

describe("beat pattern", () => {
  it("accents beat 1 by default in 4/4", () => {
    const pattern = defaultBeatPattern(4);
    expect(pattern).toEqual([1, 0, 0, 0]);
    expect(isAccentBeat(pattern, 1)).toBe(true);
    expect(isAccentBeat(pattern, 2)).toBe(false);
    expect(serializeBeatPattern(pattern)).toBe("1,0,0,0");
    expect(parseBeatPattern("1,0,1,0", 4)).toEqual([1, 0, 1, 0]);
    expect(parseBeatPattern("bad", 4)).toEqual([1, 0, 0, 0]);
  });
});
