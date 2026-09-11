import type { Database } from "@/types/database";
import type { SessionTransportStatus } from "@/lib/sync/types";
import { parseBeatPattern } from "@/lib/sessions/pattern";
import { beatsPerBar, parseTimeSignature } from "@/lib/tempo/time-signature";
import { DEFAULT_SAMPLE_RATE } from "@/lib/tempo/constants";

export type MasterSession = {
  id: string;
  teamId: string;
  createdBy: string;
  status: SessionTransportStatus;
  bpm: number;
  genreId: string | null;
  timeSignature: string;
  beatPattern: number[];
  sampleRate: number;
  startAt: string | null;
  pauseAt: string | null;
  positionBeats: number;
  revision: number;
  countInBars: number;
  activeSongId: string | null;
  activeSetlistId: string | null;
  activeSectionId: string | null;
  monitorAudioEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type SessionRow = Database["public"]["Tables"]["beat_sessions"]["Row"];

export function mapBeatSessionRow(row: SessionRow): MasterSession {
  const timeSignature = row.time_signature || "4/4";
  const parsed = parseTimeSignature(timeSignature);
  const barLength = parsed.ok ? beatsPerBar(parsed.value) : 4;

  return {
    id: row.id,
    teamId: row.team_id,
    createdBy: row.created_by,
    status: row.status,
    bpm: Number(row.bpm),
    genreId: row.genre_id,
    timeSignature,
    beatPattern: parseBeatPattern(row.beat_pattern, barLength),
    sampleRate: Number(row.sample_rate ?? DEFAULT_SAMPLE_RATE),
    startAt: row.start_at,
    pauseAt: row.pause_at,
    positionBeats: Number(row.position_beats ?? 0),
    revision: Number(row.revision),
    countInBars: Number(row.count_in_bars ?? 0),
    activeSongId: row.active_song_id,
    activeSetlistId: row.active_setlist_id,
    activeSectionId: row.active_section_id,
    monitorAudioEnabled: Boolean(row.monitor_audio_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
