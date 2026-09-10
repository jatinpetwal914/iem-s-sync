import { describe, expect, it } from "vitest";
import { SessionRevisionGate } from "@/lib/sync/revision-gate";

describe("revision gate", () => {
  it("applies newer revisions and ignores stale, duplicate, and out-of-order events", () => {
    const gate = new SessionRevisionGate();
    expect(gate.apply(1)).toBe(true);
    expect(gate.apply(1)).toBe(false);
    expect(gate.evaluate(1)).toBe("duplicate");
    expect(gate.evaluate(0)).toBe("stale");
    expect(gate.apply(0)).toBe(false);
    expect(gate.apply(3)).toBe(true);
    expect(gate.revision).toBe(3);
    expect(gate.apply(2)).toBe(false);
  });
});
