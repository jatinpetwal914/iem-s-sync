"use client";

import { useEffect, useState } from "react";
import { useSupabaseBrowserClient } from "@/hooks/use-supabase-browser-client";
import { performanceChannelName } from "@/lib/sync/channels";
import { fetchPerformanceLibrary } from "@/features/songs/client";
import type {
  PerformanceSection,
  PerformanceSetlist,
  PerformanceSetlistItem,
  PerformanceSong,
} from "@/features/songs/section-kinds";

export function usePerformanceLibrary(teamId: string) {
  const supabase = useSupabaseBrowserClient();
  const [songs, setSongs] = useState<PerformanceSong[]>([]);
  const [sections, setSections] = useState<PerformanceSection[]>([]);
  const [setlists, setSetlists] = useState<PerformanceSetlist[]>([]);
  const [items, setItems] = useState<PerformanceSetlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const next = await fetchPerformanceLibrary(supabase, teamId);
        if (cancelled) {
          return;
        }
        setSongs(next.songs);
        setSections(next.sections);
        setSetlists(next.setlists);
        setItems(next.items);
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Library unavailable.");
        }
      }
    }

    void refresh();

    const channel = supabase
      .channel(performanceChannelName(teamId))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "songs", filter: `team_id=eq.${teamId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "song_sections", filter: `team_id=eq.${teamId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "setlists", filter: `team_id=eq.${teamId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "setlist_items", filter: `team_id=eq.${teamId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [supabase, teamId]);

  return { songs, sections, setlists, items, error, supabase };
}
