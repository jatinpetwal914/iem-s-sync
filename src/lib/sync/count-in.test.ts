import { describe, expect, it } from "vitest";
import { getCountInView } from "@/lib/sync/count-in";
import type { PlaybackPosition } from "@/lib/sync/types";

function position(partial: Partial<PlaybackPosition>): PlaybackPosition {
  return {
    elapsedMs: 0,
    beatIndex: 0,
    barIndex: 0,
    beatNumber: 1,
    barNumber: 1,
    beatInBar: 1,
    phase: 0,
    isPlaying: true,
    isScheduled: false,
    ...partial,
  };
}

describe("count-in view", () => {
  it("is inactive when count-in is off", () => {
    const view = getCountInView(position({ beatIndex: 2, barNumber: 1 }), 0, 4);
    expect(view.active).toBe(false);
    expect(view.display).toBeNull();
    expect(view.songBarNumber).toBe(1);
  });

  it("counts remaining beats on the shared timeline", () => {
    const view = getCountInView(position({ beatIndex: 0, barNumber: 1 }), 1, 4);
    expect(view.active).toBe(true);
    expect(view.display).toBe("4");
  });

  it("offsets song bars after the count-in", () => {
    const view = getCountInView(position({ beatIndex: 5, barNumber: 2 }), 1, 4);
    expect(view.active).toBe(false);
    expect(view.songBarNumber).toBe(1);
  });
});
