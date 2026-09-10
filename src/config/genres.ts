export type GenreId =
  | "ambient-slow-grooves"
  | "lofi-hip-hop-reggae"
  | "boom-bap-rnb"
  | "pop-synthwave-house"
  | "techno-trance-edm"
  | "trap-future-bass"
  | "drum-and-bass-jungle"
  | "speedcore-extratone";

export type Genre = {
  id: GenreId;
  name: string;
  shortName: string;
  bpmMin: number;
  bpmMax: number;
  allowsAboveMax: boolean;
  description: string;
};

export const genres = [
  {
    id: "ambient-slow-grooves",
    name: "Ambient / Slow Grooves",
    shortName: "Ambient",
    bpmMin: 60,
    bpmMax: 75,
    allowsAboveMax: false,
    description: "Cinematic, spacious, evolving pads",
  },
  {
    id: "lofi-hip-hop-reggae",
    name: "Lo-Fi / Hip-Hop / Reggae",
    shortName: "Lo-Fi",
    bpmMin: 76,
    bpmMax: 90,
    allowsAboveMax: false,
    description: "Laid-back, dusty swing, relaxed pockets",
  },
  {
    id: "boom-bap-rnb",
    name: "Boom Bap / R&B",
    shortName: "Boom Bap",
    bpmMin: 91,
    bpmMax: 110,
    allowsAboveMax: false,
    description: "Head-nodding grooves, syncopated basslines",
  },
  {
    id: "pop-synthwave-house",
    name: "Pop / Synthwave / House",
    shortName: "House",
    bpmMin: 111,
    bpmMax: 130,
    allowsAboveMax: false,
    description: "Upbeat, strict 4-on-the-floor driving kick",
  },
  {
    id: "techno-trance-edm",
    name: "Techno / Trance / EDM",
    shortName: "Techno",
    bpmMin: 131,
    bpmMax: 145,
    allowsAboveMax: false,
    description: "High-energy, hypnotically repetitive grids",
  },
  {
    id: "trap-future-bass",
    name: "Trap / Future Bass",
    shortName: "Trap",
    bpmMin: 146,
    bpmMax: 160,
    allowsAboveMax: false,
    description: "Aggressive half-time snare with rapid hi-hats",
  },
  {
    id: "drum-and-bass-jungle",
    name: "Drum & Bass / Jungle",
    shortName: "DnB",
    bpmMin: 161,
    bpmMax: 180,
    allowsAboveMax: false,
    description: "Urgent breakbeat syncopation",
  },
  {
    id: "speedcore-extratone",
    name: "Speedcore / Extratone",
    shortName: "Speedcore",
    bpmMin: 181,
    bpmMax: 240,
    allowsAboveMax: true,
    description: "Chaotic hyper-fast industrial rhythms",
  },
] as const satisfies readonly Genre[];

export function getGenre(id: GenreId): Genre {
  const genre = genres.find((entry) => entry.id === id);
  if (!genre) {
    throw new Error(`Unknown genre: ${id}`);
  }
  return genre;
}

export function getRecommendedBpmRange(genre: Genre): {
  min: number;
  max: number;
} {
  return { min: genre.bpmMin, max: genre.bpmMax };
}

export function isBpmInRecommendedRange(bpm: number, genre: Genre): boolean {
  if (!Number.isFinite(bpm)) {
    return false;
  }
  if (bpm < genre.bpmMin) {
    return false;
  }
  if (genre.allowsAboveMax) {
    return true;
  }
  return bpm <= genre.bpmMax;
}

export function findGenresForBpm(bpm: number): Genre[] {
  return genres.filter((genre) => isBpmInRecommendedRange(bpm, genre));
}

export function isGenreId(value: string): value is GenreId {
  return genres.some((genre) => genre.id === value);
}
