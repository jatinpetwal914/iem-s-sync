import type { Database } from "@/types/database";
import type { TypedSupabase } from "@/features/sessions/client";
import type {
  PerformanceSection,
  PerformanceSetlist,
  PerformanceSetlistItem,
  PerformanceSong,
  SongSectionKind,
} from "@/features/songs/section-kinds";
import { lyricCuesToJson, parseLyricCues } from "@/lib/lyrics/cues";
import {
  DEFAULT_LYRICS_SETTINGS,
  isLyricsEffect,
  isLyricsSpeed,
  isLyricsTransition,
  type LyricsEffect,
  type LyricsSpeed,
  type LyricsTransition,
} from "@/lib/lyrics/types";
import type { LyricLineCue } from "@/lib/lyrics/types";

type SongRow = Database["public"]["Tables"]["songs"]["Row"];
type SectionRow = Database["public"]["Tables"]["song_sections"]["Row"];
type SetlistRow = Database["public"]["Tables"]["setlists"]["Row"];
type ItemRow = Database["public"]["Tables"]["setlist_items"]["Row"];

export function mapSong(row: SongRow): PerformanceSong {
  return {
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    bpm: row.bpm == null ? null : Number(row.bpm),
    timeSignature: row.time_signature,
    musicalKey: row.musical_key,
    notes: row.notes,
    backingTrackUrl: row.backing_track_url,
    lyricsEffect: asLyricsEffect(row.lyrics_effect),
    lyricsTransition: asLyricsTransition(row.lyrics_transition),
    lyricsAutoAdvance: row.lyrics_auto_advance,
    lyricsHighlight: row.lyrics_highlight,
    lyricsUpcomingLines: asUpcoming(row.lyrics_upcoming_lines),
    lyricsSpeed: asLyricsSpeed(row.lyrics_speed),
  };
}

export function mapSection(row: SectionRow): PerformanceSection {
  return {
    id: row.id,
    songId: row.song_id,
    teamId: row.team_id,
    kind: row.kind,
    title: row.title,
    sortOrder: row.sort_order,
    startBar: row.start_bar,
    bars: row.bars,
    lyrics: row.lyrics,
    chords: row.chords,
    lyricCues: parseLyricCues(row.lyric_cues, []),
  };
}

export function mapSetlist(row: SetlistRow): PerformanceSetlist {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
  };
}

export function mapSetlistItem(row: ItemRow): PerformanceSetlistItem {
  return {
    id: row.id,
    setlistId: row.setlist_id,
    songId: row.song_id,
    teamId: row.team_id,
    sortOrder: row.sort_order,
  };
}

export async function fetchPerformanceLibrary(
  supabase: TypedSupabase,
  teamId: string,
): Promise<{
  songs: PerformanceSong[];
  sections: PerformanceSection[];
  setlists: PerformanceSetlist[];
  items: PerformanceSetlistItem[];
}> {
  const [songsRes, sectionsRes, setlistsRes, itemsRes] = await Promise.all([
    supabase.from("songs").select("*").eq("team_id", teamId).order("title"),
    supabase.from("song_sections").select("*").eq("team_id", teamId).order("sort_order"),
    supabase.from("setlists").select("*").eq("team_id", teamId).order("name"),
    supabase.from("setlist_items").select("*").eq("team_id", teamId).order("sort_order"),
  ]);

  if (songsRes.error || sectionsRes.error || setlistsRes.error || itemsRes.error) {
    throw new Error("Could not load the performance library.");
  }

  return {
    songs: (songsRes.data ?? []).map(mapSong),
    sections: (sectionsRes.data ?? []).map(mapSection),
    setlists: (setlistsRes.data ?? []).map(mapSetlist),
    items: (itemsRes.data ?? []).map(mapSetlistItem),
  };
}

export async function createSong(
  supabase: TypedSupabase,
  input: {
    teamId: string;
    userId: string;
    title: string;
    bpm: number | null;
    timeSignature: string;
    musicalKey: string | null;
  },
) {
  const { error } = await supabase.from("songs").insert({
    team_id: input.teamId,
    created_by: input.userId,
    title: input.title.trim(),
    bpm: input.bpm,
    time_signature: input.timeSignature,
    musical_key: input.musicalKey,
  });
  if (error) {
    throw new Error(error.message || "Could not create the song.");
  }
}

export async function updateSong(
  supabase: TypedSupabase,
  songId: string,
  patch: {
    title?: string;
    bpm?: number | null;
    timeSignature?: string;
    musicalKey?: string | null;
    notes?: string | null;
    lyricsEffect?: LyricsEffect;
    lyricsTransition?: LyricsTransition;
    lyricsAutoAdvance?: boolean;
    lyricsHighlight?: boolean;
    lyricsUpcomingLines?: 1 | 2 | 3;
    lyricsSpeed?: LyricsSpeed;
  },
) {
  const { error } = await supabase
    .from("songs")
    .update({
      title: patch.title,
      bpm: patch.bpm,
      time_signature: patch.timeSignature,
      musical_key: patch.musicalKey,
      notes: patch.notes,
      lyrics_effect: patch.lyricsEffect,
      lyrics_transition: patch.lyricsTransition,
      lyrics_auto_advance: patch.lyricsAutoAdvance,
      lyrics_highlight: patch.lyricsHighlight,
      lyrics_upcoming_lines: patch.lyricsUpcomingLines,
      lyrics_speed: patch.lyricsSpeed,
    })
    .eq("id", songId);
  if (error) {
    throw new Error(error.message || "Could not update the song.");
  }
}

export async function deleteSong(supabase: TypedSupabase, songId: string) {
  const { error } = await supabase.from("songs").delete().eq("id", songId);
  if (error) {
    throw new Error(error.message || "Could not delete the song.");
  }
}

export async function createSection(
  supabase: TypedSupabase,
  input: {
    songId: string;
    teamId: string;
    kind: SongSectionKind;
    title: string;
    sortOrder: number;
    startBar: number;
    bars: number | null;
    lyrics: string | null;
    chords: string | null;
    lyricCues?: LyricLineCue[];
  },
) {
  const { error } = await supabase.from("song_sections").insert({
    song_id: input.songId,
    team_id: input.teamId,
    kind: input.kind,
    title: input.title.trim(),
    sort_order: input.sortOrder,
    start_bar: input.startBar,
    bars: input.bars,
    lyrics: input.lyrics,
    chords: input.chords,
    lyric_cues: lyricCuesToJson(input.lyricCues ?? []),
  });
  if (error) {
    throw new Error(error.message || "Could not add the section.");
  }
}

export async function updateSection(
  supabase: TypedSupabase,
  sectionId: string,
  patch: {
    title?: string;
    kind?: SongSectionKind;
    startBar?: number;
    bars?: number | null;
    lyrics?: string | null;
    chords?: string | null;
    lyricCues?: LyricLineCue[];
  },
) {
  const { error } = await supabase
    .from("song_sections")
    .update({
      title: patch.title,
      kind: patch.kind,
      start_bar: patch.startBar,
      bars: patch.bars,
      lyrics: patch.lyrics,
      chords: patch.chords,
      lyric_cues: patch.lyricCues ? lyricCuesToJson(patch.lyricCues) : undefined,
    })
    .eq("id", sectionId);
  if (error) {
    throw new Error(error.message || "Could not update the section.");
  }
}

export async function deleteSection(supabase: TypedSupabase, sectionId: string) {
  const { error } = await supabase.from("song_sections").delete().eq("id", sectionId);
  if (error) {
    throw new Error(error.message || "Could not delete the section.");
  }
}

export async function createSetlist(
  supabase: TypedSupabase,
  input: { teamId: string; userId: string; name: string },
) {
  const { error } = await supabase.from("setlists").insert({
    team_id: input.teamId,
    created_by: input.userId,
    name: input.name.trim(),
  });
  if (error) {
    throw new Error(error.message || "Could not create the setlist.");
  }
}

export async function deleteSetlist(supabase: TypedSupabase, setlistId: string) {
  const { error } = await supabase.from("setlists").delete().eq("id", setlistId);
  if (error) {
    throw new Error(error.message || "Could not delete the setlist.");
  }
}

export async function addSetlistItem(
  supabase: TypedSupabase,
  input: { setlistId: string; songId: string; teamId: string; sortOrder: number },
) {
  const { error } = await supabase.from("setlist_items").insert({
    setlist_id: input.setlistId,
    song_id: input.songId,
    team_id: input.teamId,
    sort_order: input.sortOrder,
  });
  if (error) {
    throw new Error(error.message || "Could not add the song to the setlist.");
  }
}

export async function removeSetlistItem(supabase: TypedSupabase, itemId: string) {
  const { error } = await supabase.from("setlist_items").delete().eq("id", itemId);
  if (error) {
    throw new Error(error.message || "Could not remove the setlist song.");
  }
}

export async function reorderSetlistItem(
  supabase: TypedSupabase,
  itemId: string,
  sortOrder: number,
) {
  const { error } = await supabase
    .from("setlist_items")
    .update({ sort_order: sortOrder })
    .eq("id", itemId);
  if (error) {
    throw new Error(error.message || "Could not reorder the setlist.");
  }
}

function asLyricsEffect(value: string): LyricsEffect {
  return isLyricsEffect(value) ? value : DEFAULT_LYRICS_SETTINGS.effect;
}

function asLyricsTransition(value: string): LyricsTransition {
  return isLyricsTransition(value) ? value : DEFAULT_LYRICS_SETTINGS.transition;
}

function asLyricsSpeed(value: string): LyricsSpeed {
  return isLyricsSpeed(value) ? value : DEFAULT_LYRICS_SETTINGS.speed;
}

function asUpcoming(value: number): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }
  return DEFAULT_LYRICS_SETTINGS.upcomingLines;
}
