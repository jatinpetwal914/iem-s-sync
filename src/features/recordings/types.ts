import type { Database } from "@/types/database";
import type { UserRole } from "@/types/roles";

export type VoiceTake = {
  id: string;
  teamId: string;
  songId: string;
  userId: string;
  sessionId: string | null;
  title: string;
  takeNumber: number;
  storagePath: string;
  mimeType: string;
  durationMs: number;
  fileSize: number;
  status: Database["public"]["Enums"]["recording_status"];
  performerName: string | null;
  performerRole: UserRole | null;
  createdAt: string;
};

export type VoiceTakeRow = Database["public"]["Tables"]["song_recordings"]["Row"];

export function mapVoiceTake(row: VoiceTakeRow): VoiceTake {
  return {
    id: row.id,
    teamId: row.team_id,
    songId: row.song_id,
    userId: row.user_id,
    sessionId: row.session_id,
    title: row.title,
    takeNumber: row.take_number,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    durationMs: row.duration_ms,
    fileSize: row.file_size,
    status: row.status,
    performerName: row.performer_name,
    performerRole: row.performer_role,
    createdAt: row.created_at,
  };
}

export function performerLabel(take: VoiceTake): string {
  return take.performerName?.trim() || `Member ${take.userId.slice(0, 8)}`;
}
