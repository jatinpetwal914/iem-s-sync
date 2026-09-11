"use client";

import { useEffect, useState } from "react";
import { useSupabaseBrowserClient } from "@/hooks/use-supabase-browser-client";
import { performanceChannelName } from "@/lib/sync/channels";
import { fetchSongRecordings } from "@/features/recordings/client";
import type { VoiceTake } from "@/features/recordings/types";

export function useSongRecordings(teamId: string, songId: string | null) {
  const supabase = useSupabaseBrowserClient();
  const [snapshot, setSnapshot] = useState<{
    songId: string;
    recordings: VoiceTake[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!songId) {
      return;
    }

    const activeSongId = songId;
    let cancelled = false;

    async function refresh() {
      try {
        const next = await fetchSongRecordings(supabase, teamId, activeSongId);
        if (!cancelled) {
          setSnapshot({ songId: activeSongId, recordings: next });
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Recordings unavailable.");
        }
      }
    }

    void refresh();

    const channel = supabase
      .channel(`${performanceChannelName(teamId)}:recordings:${activeSongId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "song_recordings",
          filter: `song_id=eq.${activeSongId}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [supabase, teamId, songId]);

  return {
    recordings: snapshot?.songId === songId ? snapshot.recordings : [],
    error: songId ? error : null,
    supabase,
  };
}
