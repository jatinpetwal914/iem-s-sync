import { describe, expect, it } from "vitest";
import { ClockSynchronizer, syncQualityFromRtt } from "@/lib/sync/clock";

describe("clock synchronizer", () => {
  it("estimates offset from round-trip samples", async () => {
    const clock = new ClockSynchronizer(3);
    let now = 1000;

    await clock.sample(
      {
        fetchServerEpochMs: async () => {
          now = 1040;
          return 2000;
        },
      },
      () => now,
    );

    expect(clock.getSnapshot().roundTripMs).toBe(40);
    expect(clock.getSnapshot().clockOffsetMs).toBe(2000 + 20 - 1040);
    expect(clock.getSynchronizedNow(3000)).toBe(3000 + (2000 + 20 - 1040));
  });

  it("uses the median of multiple samples", async () => {
    const clock = new ClockSynchronizer(3);
    const offsets: number[] = [];

    for (const rtt of [8, 80, 10]) {
      let now = 5000;
      await clock.sample(
        {
          fetchServerEpochMs: async () => {
            now = 5000 + rtt;
            return 8000;
          },
        },
        () => now,
      );
      offsets.push(clock.getSnapshot().clockOffsetMs);
    }

    expect(clock.getSnapshot().sampleCount).toBe(3);
    const medianOffset = clock.getSnapshot().clockOffsetMs;
    expect(medianOffset).toBeCloseTo(8000 + 5 - 5010, 6);
  });

  it("classifies latency bands", () => {
    const now = 10_000;
    expect(syncQualityFromRtt(20, now, now)).toBe("EXCELLENT");
    expect(syncQualityFromRtt(120, now, now)).toBe("GOOD");
    expect(syncQualityFromRtt(250, now, now)).toBe("UNSTABLE");
    expect(syncQualityFromRtt(20, now - 20_000, now)).toBe("OFFLINE");
  });
});
