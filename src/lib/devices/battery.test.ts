import { describe, expect, it } from "vitest";
import { networkPingQuality } from "@/lib/devices/battery";

describe("networkPingQuality", () => {
  it("labels connection ping without claiming audio latency", () => {
    expect(networkPingQuality(32)).toBe("Good");
    expect(networkPingQuality(120)).toBe("Fair");
    expect(networkPingQuality(200)).toBe("Poor");
    expect(networkPingQuality(null)).toBeNull();
  });
});
