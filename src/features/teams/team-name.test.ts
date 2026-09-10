import { describe, expect, it } from "vitest";
import { parseTeamName } from "@/features/teams/team-name";

describe("parseTeamName", () => {
  it("accepts a trimmed workspace name", () => {
    expect(parseTeamName("  Pit Orchestra  ")).toEqual({
      ok: true,
      value: { name: "Pit Orchestra" },
    });
  });

  it("rejects an empty name", () => {
    const result = parseTeamName("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain("Team name is required");
    }
  });

  it("rejects names longer than 80 characters", () => {
    const result = parseTeamName("A".repeat(81));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toContain("80 characters");
    }
  });
});
