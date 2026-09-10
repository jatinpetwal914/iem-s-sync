import { describe, expect, it } from "vitest";
import {
  findGenresForBpm,
  getGenre,
  getRecommendedBpmRange,
  genres,
  isBpmInRecommendedRange,
  isGenreId,
} from "@/config/genres";

const REQUIRED_RANGES = [
  {
    id: "ambient-slow-grooves",
    name: "Ambient / Slow Grooves",
    bpmMin: 60,
    bpmMax: 75,
  },
  {
    id: "lofi-hip-hop-reggae",
    name: "Lo-Fi / Hip-Hop / Reggae",
    bpmMin: 76,
    bpmMax: 90,
  },
  {
    id: "boom-bap-rnb",
    name: "Boom Bap / R&B",
    bpmMin: 91,
    bpmMax: 110,
  },
  {
    id: "pop-synthwave-house",
    name: "Pop / Synthwave / House",
    bpmMin: 111,
    bpmMax: 130,
  },
  {
    id: "techno-trance-edm",
    name: "Techno / Trance / EDM",
    bpmMin: 131,
    bpmMax: 145,
  },
  {
    id: "trap-future-bass",
    name: "Trap / Future Bass",
    bpmMin: 146,
    bpmMax: 160,
  },
  {
    id: "drum-and-bass-jungle",
    name: "Drum & Bass / Jungle",
    bpmMin: 161,
    bpmMax: 180,
  },
  {
    id: "speedcore-extratone",
    name: "Speedcore / Extratone",
    bpmMin: 181,
    bpmMax: 240,
    allowsAboveMax: true,
  },
] as const;

describe("genre configuration", () => {
  it("covers the required genre ranges", () => {
    expect(genres).toHaveLength(8);
    for (const expected of REQUIRED_RANGES) {
      const genre = getGenre(expected.id);
      expect(genre.name).toBe(expected.name);
      expect(genre.bpmMin).toBe(expected.bpmMin);
      expect(genre.bpmMax).toBe(expected.bpmMax);
      expect(genre.allowsAboveMax).toBe("allowsAboveMax" in expected);
    }
  });

  it("keeps recommended ranges contiguous with no overlaps", () => {
    for (let index = 0; index < genres.length - 1; index += 1) {
      const current = genres[index];
      const next = genres[index + 1];
      if (!current || !next) {
        continue;
      }
      expect(current.bpmMax + 1).toBe(next.bpmMin);
      expect(current.allowsAboveMax).toBe(false);
    }
    expect(genres.at(-1)?.allowsAboveMax).toBe(true);
  });

  it("classifies boundary BPM values into a single genre", () => {
    expect(findGenresForBpm(59)).toEqual([]);
    expect(findGenresForBpm(60).map((genre) => genre.id)).toEqual([
      "ambient-slow-grooves",
    ]);
    expect(findGenresForBpm(75).map((genre) => genre.id)).toEqual([
      "ambient-slow-grooves",
    ]);
    expect(findGenresForBpm(76).map((genre) => genre.id)).toEqual([
      "lofi-hip-hop-reggae",
    ]);
    expect(findGenresForBpm(90).map((genre) => genre.id)).toEqual([
      "lofi-hip-hop-reggae",
    ]);
    expect(findGenresForBpm(91).map((genre) => genre.id)).toEqual([
      "boom-bap-rnb",
    ]);
    expect(findGenresForBpm(180).map((genre) => genre.id)).toEqual([
      "drum-and-bass-jungle",
    ]);
    expect(findGenresForBpm(181).map((genre) => genre.id)).toEqual([
      "speedcore-extratone",
    ]);
    expect(findGenresForBpm(240).map((genre) => genre.id)).toEqual([
      "speedcore-extratone",
    ]);
    expect(findGenresForBpm(241).map((genre) => genre.id)).toEqual([
      "speedcore-extratone",
    ]);
  });

  it("treats recommended ranges as guidance, not a lock on BPM", () => {
    const house = getGenre("pop-synthwave-house");
    expect(getRecommendedBpmRange(house)).toEqual({ min: 111, max: 130 });
    expect(isBpmInRecommendedRange(120, house)).toBe(true);
    expect(isBpmInRecommendedRange(90, house)).toBe(false);
    expect(isBpmInRecommendedRange(200, house)).toBe(false);
    expect(isBpmInRecommendedRange(Number.NaN, house)).toBe(false);
    expect(isBpmInRecommendedRange(260, getGenre("speedcore-extratone"))).toBe(
      true,
    );
  });

  it("guards genre ids", () => {
    expect(isGenreId("pop-synthwave-house")).toBe(true);
    expect(isGenreId("not-a-genre")).toBe(false);
  });
});
