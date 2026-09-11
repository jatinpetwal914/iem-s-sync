"use client";

import { useState } from "react";
import { useSupabaseBrowserClient } from "@/hooks/use-supabase-browser-client";
import {
  addSetlistItem,
  createSetlist,
  deleteSetlist,
  removeSetlistItem,
  reorderSetlistItem,
} from "@/features/songs/client";
import type {
  PerformanceSetlist,
  PerformanceSetlistItem,
  PerformanceSong,
} from "@/features/songs/section-kinds";

type SetlistPanelProps = {
  teamId: string;
  userId: string;
  songs: PerformanceSong[];
  setlists: PerformanceSetlist[];
  items: PerformanceSetlistItem[];
  activeSetlistId: string | null;
  activeSongId: string | null;
  onSelectSetlist: (setlistId: string) => void;
  onSelectSong: (songId: string, setlistId: string) => void;
};

export function SetlistPanel({
  teamId,
  userId,
  songs,
  setlists,
  items,
  activeSetlistId,
  activeSongId,
  onSelectSetlist,
  onSelectSong,
}: SetlistPanelProps) {
  const supabase = useSupabaseBrowserClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const current = setlists.find((entry) => entry.id === activeSetlistId) ?? setlists[0] ?? null;
  const currentItems = items
    .filter((item) => item.setlistId === current?.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const songMap = new Map(songs.map((song) => [song.id, song]));
  const activeIndex = currentItems.findIndex((item) => item.songId === activeSongId);

  async function run(task: () => Promise<void>) {
    try {
      setError(null);
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setlist update failed.");
    }
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">SETLIST</p>

      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await createSetlist(supabase, { teamId, userId, name });
            setName("");
          });
        }}
      >
        <input
          className="studio-input flex-1"
          placeholder="Setlist name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <button type="submit" className="studio-action">
          Create
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {setlists.map((setlist) => (
          <button
            key={setlist.id}
            type="button"
            className={`rounded-full border px-3 py-1 text-sm ${
              setlist.id === current?.id
                ? "border-accent text-accent"
                : "border-white/12 text-muted"
            }`}
            onClick={() => onSelectSetlist(setlist.id)}
          >
            {setlist.name}
          </button>
        ))}
      </div>

      {current ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <select
              className="studio-input"
              aria-label="Add song to setlist"
              defaultValue=""
              onChange={(event) => {
                const songId = event.target.value;
                event.target.value = "";
                if (!songId) {
                  return;
                }
                void run(() =>
                  addSetlistItem(supabase, {
                    setlistId: current.id,
                    songId,
                    teamId,
                    sortOrder: currentItems.length,
                  }),
                );
              }}
            >
              <option value="">Add song…</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="studio-action"
              disabled={activeIndex <= 0}
              onClick={() => {
                const previous = currentItems[activeIndex - 1];
                if (previous) {
                  onSelectSong(previous.songId, current.id);
                }
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="studio-action"
              disabled={activeIndex < 0 || activeIndex >= currentItems.length - 1}
              onClick={() => {
                const next = currentItems[activeIndex + 1];
                if (next) {
                  onSelectSong(next.songId, current.id);
                }
              }}
            >
              Next
            </button>
            <button
              type="button"
              className="studio-action"
              onClick={() => void run(() => deleteSetlist(supabase, current.id))}
            >
              Delete setlist
            </button>
          </div>

          <ol className="mt-4 flex flex-col gap-2">
            {currentItems.map((item, index) => {
              const song = songMap.get(item.songId);
              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                    item.songId === activeSongId
                      ? "border-accent bg-accent/10"
                      : "border-white/8"
                  }`}
                >
                  <span className="w-8 font-mono text-sm text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    className="flex-1 text-left font-semibold"
                    onClick={() => onSelectSong(item.songId, current.id)}
                  >
                    {song?.title ?? "Missing song"}
                  </button>
                  <button
                    type="button"
                    className="studio-step"
                    disabled={index === 0}
                    aria-label="Move up"
                    onClick={() => {
                      const previous = currentItems[index - 1];
                      if (!previous) {
                        return;
                      }
                      void run(async () => {
                        await reorderSetlistItem(supabase, item.id, previous.sortOrder);
                        await reorderSetlistItem(supabase, previous.id, item.sortOrder);
                      });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="studio-step"
                    disabled={index === currentItems.length - 1}
                    aria-label="Move down"
                    onClick={() => {
                      const next = currentItems[index + 1];
                      if (!next) {
                        return;
                      }
                      void run(async () => {
                        await reorderSetlistItem(supabase, item.id, next.sortOrder);
                        await reorderSetlistItem(supabase, next.id, item.sortOrder);
                      });
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="font-mono text-[10px] text-beat"
                    onClick={() => void run(() => removeSetlistItem(supabase, item.id))}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">Create a setlist to start the show order.</p>
      )}

      {error ? (
        <p className="mt-3 text-sm text-beat" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
