import { describe, expect, it } from "vitest";
import {
  desiredTopology,
  mergeSources,
  neededRemoteSourceIds,
  parseSources,
  shouldApplyMixRevision,
  sourceIsAudible,
} from "@/lib/monitor/mix";
import { SELF_SOURCE_ID, SYNC_SOURCE_ID } from "@/lib/monitor/types";
import { applyMonitorPreset } from "@/lib/monitor/presets";

const RAHUL = "11111111-1111-4111-8111-111111111111";
const PRIYA = "22222222-2222-4222-8222-222222222222";
const AMIT = "33333333-3333-4333-8333-333333333333";

describe("monitor mix routing", () => {
  it("never treats self or click as remote WebRTC sources", () => {
    const sources = parseSources({
      [SELF_SOURCE_ID]: { gain: 100, muted: false, solo: false },
      [SYNC_SOURCE_ID]: { gain: 60, muted: false, solo: false },
      [RAHUL]: { gain: 80, muted: false, solo: false },
      junk: { gain: 100 },
    });
    expect(neededRemoteSourceIds(sources, PRIYA)).toEqual([RAHUL]);
    expect(sourceIsAudible(sources[SYNC_SOURCE_ID])).toBe(true);
  });

  it("builds a selective mesh instead of full all-to-all", () => {
    const topology = desiredTopology(
      PRIYA,
      [
        {
          receiverId: PRIYA,
          sources: {
            [SELF_SOURCE_ID]: { gain: 100, muted: false, solo: false },
            [RAHUL]: { gain: 80, muted: false, solo: false },
            [AMIT]: { gain: 0, muted: false, solo: false },
          },
        },
        {
          receiverId: RAHUL,
          sources: {
            [PRIYA]: { gain: 0, muted: false, solo: false },
          },
        },
      ],
      [RAHUL, PRIYA, AMIT],
    );
    expect(topology.receiveFrom).toEqual([RAHUL]);
    expect(topology.sendTo).toEqual([]);
  });

  it("sends to members whose mix includes the local user", () => {
    const topology = desiredTopology(
      RAHUL,
      [
        {
          receiverId: PRIYA,
          sources: {
            [RAHUL]: { gain: 80, muted: false, solo: false },
          },
        },
      ],
      [RAHUL, PRIYA],
    );
    expect(topology.sendTo).toEqual([PRIYA]);
    expect(topology.receiveFrom).toEqual([]);
  });

  it("keeps member overlay from overwriting admin values it did not touch", () => {
    const merged = mergeSources(
      { [RAHUL]: { gain: 80, muted: false, solo: false } },
      { [RAHUL]: { gain: 50, muted: false, solo: false } },
    );
    expect(merged[RAHUL]?.gain).toBe(50);
  });

  it("ignores stale mix revisions", () => {
    expect(shouldApplyMixRevision(2, 3)).toBe(false);
    expect(shouldApplyMixRevision(3, 3)).toBe(true);
    expect(shouldApplyMixRevision(4, 3)).toBe(true);
  });

  it("applies a flutist preset without inventing extra identity", () => {
    const sources = applyMonitorPreset("flutist", PRIYA, [
      { membershipId: "1", userId: PRIYA, displayName: "Priya", role: "MEMBER" },
      { membershipId: "2", userId: RAHUL, displayName: "Rahul Singer", role: "MEMBER" },
    ]);
    expect(sources[SELF_SOURCE_ID]?.gain).toBe(100);
    expect(sources[SYNC_SOURCE_ID]?.gain).toBe(60);
    expect(sources[RAHUL]?.gain).toBe(80);
    expect(sources[PRIYA]).toBeUndefined();
  });
});
