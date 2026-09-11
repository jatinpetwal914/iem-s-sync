import type { TypedSupabase } from "@/features/sessions/client";
import {
  recordingStoragePath,
  VOICE_TAKES_BUCKET,
  type VoiceTakeBlob,
} from "@/lib/audio/recording";
import { mapVoiceTake, type VoiceTake } from "@/features/recordings/types";

export async function fetchSongRecordings(
  supabase: TypedSupabase,
  teamId: string,
  songId: string,
): Promise<VoiceTake[]> {
  const { data, error } = await supabase
    .from("song_recordings")
    .select("*")
    .eq("team_id", teamId)
    .eq("song_id", songId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Could not load recordings.");
  }
  return (data ?? []).map(mapVoiceTake);
}

export async function saveVoiceTake(
  supabase: TypedSupabase,
  input: {
    teamId: string;
    songId: string;
    userId: string;
    sessionId: string | null;
    title: string;
    take: VoiceTakeBlob;
  },
): Promise<VoiceTake> {
  const recordingId = crypto.randomUUID();
  const storagePath = recordingStoragePath({
    teamId: input.teamId,
    songId: input.songId,
    userId: input.userId,
    recordingId,
    mimeType: input.take.mimeType,
  });

  const uploaded = await supabase.storage.from(VOICE_TAKES_BUCKET).upload(storagePath, input.take.blob, {
    contentType: input.take.mimeType || input.take.blob.type || "audio/webm",
    upsert: false,
  });

  if (uploaded.error) {
    throw new Error(uploaded.error.message || "Could not upload the recording.");
  }

  const inserted = await supabase
    .from("song_recordings")
    .insert({
      id: recordingId,
      team_id: input.teamId,
      song_id: input.songId,
      user_id: input.userId,
      session_id: input.sessionId,
      title: input.title.trim() || "Take",
      storage_path: storagePath,
      mime_type: input.take.mimeType || input.take.blob.type || "audio/webm",
      duration_ms: input.take.durationMs,
      file_size: input.take.blob.size,
      status: "ready",
    })
    .select("*")
    .single();

  if (inserted.error || !inserted.data) {
    const removed = await supabase.storage.from(VOICE_TAKES_BUCKET).remove([storagePath]);
    if (removed.error) {
      throw new Error(
        "The audio uploaded, but saving the take failed and the file could not be removed. Try again.",
      );
    }
    throw new Error(inserted.error?.message || "Could not save the take.");
  }

  return mapVoiceTake(inserted.data);
}

export async function renameVoiceTake(
  supabase: TypedSupabase,
  recordingId: string,
  title: string,
) {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Give the take a name.");
  }
  const { error } = await supabase
    .from("song_recordings")
    .update({ title: trimmed })
    .eq("id", recordingId);
  if (error) {
    throw new Error(error.message || "Could not rename the take.");
  }
}

export async function deleteVoiceTake(
  supabase: TypedSupabase,
  take: VoiceTake,
): Promise<void> {
  const removed = await supabase.storage.from(VOICE_TAKES_BUCKET).remove([take.storagePath]);
  if (removed.error) {
    throw new Error(
      removed.error.message ||
        "Could not delete the audio file. The take was left in the library.",
    );
  }

  const { error } = await supabase.from("song_recordings").delete().eq("id", take.id);
  if (error) {
    throw new Error(
      "The audio file was removed, but the library entry could not be deleted. Refresh and try again.",
    );
  }
}

export async function signedRecordingUrl(
  supabase: TypedSupabase,
  storagePath: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(VOICE_TAKES_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Could not open that recording.");
  }
  return data.signedUrl;
}
