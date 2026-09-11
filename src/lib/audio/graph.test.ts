import { describe, expect, it } from "vitest";
import {
  clampDb,
  clampPercent,
  effectiveChannelGain,
  percentToGain,
  rampGain,
} from "@/lib/audio/graph";

describe("audio graph helpers", () => {
  it("clamps percent and converts to gain", () => {
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(-8)).toBe(0);
    expect(percentToGain(50)).toBe(0.5);
  });

  it("clamps EQ to ±12 dB", () => {
    expect(clampDb(20)).toBe(12);
    expect(clampDb(-20)).toBe(-12);
  });

  it("silences muted or soloed-out channels", () => {
    expect(effectiveChannelGain(80, true, false)).toBe(0);
    expect(effectiveChannelGain(80, false, true)).toBe(0);
    expect(effectiveChannelGain(80, false, false)).toBe(0.8);
  });

  it("ramps existing gain params instead of jumping", () => {
    const ramps: number[] = [];
    const param = {
      value: 1,
      cancelScheduledValues() {
        return param as unknown as AudioParam;
      },
      setValueAtTime(next: number) {
        this.value = next;
        return param as unknown as AudioParam;
      },
      linearRampToValueAtTime(next: number) {
        ramps.push(next);
        this.value = next;
        return param as unknown as AudioParam;
      },
    };
    rampGain({ gain: param }, 0.4, { currentTime: 1 });
    expect(ramps).toEqual([0.4]);
  });
});
