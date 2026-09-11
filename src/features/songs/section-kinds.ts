import type { Database } from "@/types/database";
import type {
  LyricLineCue,
  LyricsEffect,
  LyricsSpeed,
  LyricsTransition,
} from "@/lib/lyrics/types";

export type SongSectionKind = Database["public"]["Enums"]["song_section_kind"];

export type PerformanceSong = {
  id: string;
  teamId: string;
  title: string;
  bpm: number | null;
  timeSignature: string;
  musicalKey: string | null;
  notes: string | null;
  backingTrackUrl: string | null;
  lyricsEffect: LyricsEffect;
  lyricsTransition: LyricsTransition;
  lyricsAutoAdvance: boolean;
  lyricsHighlight: boolean;
  lyricsUpcomingLines: 1 | 2 | 3;
  lyricsSpeed: LyricsSpeed;
};

export type PerformanceSection = {
  id: string;
  songId: string;
  teamId: string;
  kind: SongSectionKind;
  title: string;
  sortOrder: number;
  startBar: number;
  bars: number | null;
  lyrics: string | null;
  chords: string | null;
  lyricCues: LyricLineCue[];
};

export type PerformanceSetlist = {
  id: string;
  teamId: string;
  name: string;
};

export type PerformanceSetlistItem = {
  id: string;
  setlistId: string;
  songId: string;
  teamId: string;
  sortOrder: number;
};

export const SECTION_KIND_OPTIONS: { id: SongSectionKind; label: string }[] = [
  { id: "intro", label: "Intro" },
  { id: "verse", label: "Verse" },
  { id: "pre_chorus", label: "Pre-Chorus" },
  { id: "chorus", label: "Chorus" },
  { id: "bridge", label: "Bridge" },
  { id: "solo", label: "Solo" },
  { id: "outro", label: "Outro" },
  { id: "custom", label: "Custom" },
];
