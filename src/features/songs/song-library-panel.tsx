"use client";

import { useState } from "react";
import { TIME_SIGNATURE_OPTIONS } from "@/lib/sessions/time-signatures";
import { useSupabaseBrowserClient } from "@/hooks/use-supabase-browser-client";
import {
  createSection,
  createSong,
  deleteSection,
  deleteSong,
  updateSection,
  updateSong,
} from "@/features/songs/client";
import { SECTION_KIND_OPTIONS } from "@/features/songs/section-kinds";
import type { PerformanceSection, PerformanceSong, SongSectionKind } from "@/features/songs/section-kinds";
import { formatCueSeconds, parseCueSeconds, splitLyricLines } from "@/lib/lyrics/cues";
import {
  LYRICS_EFFECT_OPTIONS,
  type LyricsEffect,
  type LyricsSpeed,
  type LyricsTransition,
} from "@/lib/lyrics/types";

type SongLibraryPanelProps = {
  teamId: string;
  userId: string;
  songs: PerformanceSong[];
  sections: PerformanceSection[];
  activeSongId: string | null;
  onSelectSong: (songId: string) => void;
};

export function SongLibraryPanel({
  teamId,
  userId,
  songs,
  sections,
  activeSongId,
  onSelectSong,
}: SongLibraryPanelProps) {
  const supabase = useSupabaseBrowserClient();
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [signature, setSignature] = useState("4/4");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(activeSongId);
  const selected = songs.find((song) => song.id === selectedId) ?? null;
  const selectedSections = sections
    .filter((section) => section.songId === selected?.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="rounded-2xl border border-white/8 bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">SONGS</p>

      <form
        className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const parsedBpm = bpm.trim() === "" ? null : Number(bpm);
          void (async () => {
            try {
              setError(null);
              await createSong(supabase, {
                teamId,
                userId,
                title,
                bpm: parsedBpm != null && Number.isFinite(parsedBpm) ? parsedBpm : null,
                timeSignature: signature,
                musicalKey: key.trim() || null,
              });
              setTitle("");
              setBpm("");
              setKey("");
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not create song.");
            }
          })();
        }}
      >
        <input
          className="studio-input sm:col-span-2"
          placeholder="Song title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <input
          className="studio-input"
          placeholder="BPM"
          inputMode="decimal"
          value={bpm}
          onChange={(event) => setBpm(event.target.value)}
        />
        <select
          className="studio-input"
          value={signature}
          onChange={(event) => setSignature(event.target.value)}
        >
          {TIME_SIGNATURE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          className="studio-input"
          placeholder="Key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
        <button type="submit" className="studio-action w-full">
          Add
        </button>
      </form>

      <ul className="mt-4 flex flex-col gap-2">
        {songs.map((song) => (
          <li key={song.id}>
            <button
              type="button"
              className={`w-full rounded-xl border px-3 py-2 text-left ${
                song.id === selectedId
                  ? "border-accent bg-accent/10"
                  : "border-white/8"
              }`}
              onClick={() => setSelectedId(song.id)}
            >
              <span className="font-semibold">{song.title}</span>
              <span className="ml-2 font-mono text-xs text-muted">
                {song.bpm ?? "—"} BPM · {song.timeSignature}
                {song.musicalKey ? ` · ${song.musicalKey}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
            <SongEditor
          key={selected.id}
          song={selected}
          sections={selectedSections}
          isActive={selected.id === activeSongId}
          onSave={async (patch) => {
            try {
              setError(null);
              await updateSong(supabase, selected.id, patch);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not save song.");
            }
          }}
          onDelete={async () => {
            try {
              setError(null);
              await deleteSong(supabase, selected.id);
              setSelectedId(null);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not delete song.");
            }
          }}
          onSelect={() => onSelectSong(selected.id)}
          onAddSection={async (input) => {
            try {
              setError(null);
              await createSection(supabase, {
                songId: selected.id,
                teamId,
                sortOrder: selectedSections.length,
                ...input,
              });
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not add section.");
            }
          }}
          onUpdateSection={async (id, patch) => {
            try {
              setError(null);
              await updateSection(supabase, id, patch);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not save section.");
            }
          }}
          onDeleteSection={async (id) => {
            try {
              setError(null);
              await deleteSection(supabase, id);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not delete section.");
            }
          }}
        />
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-beat" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function SongEditor({
  song,
  sections,
  isActive,
  onSave,
  onDelete,
  onSelect,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
}: {
  song: PerformanceSong;
  sections: PerformanceSection[];
  isActive: boolean;
  onSave: (patch: {
    title?: string;
    bpm?: number | null;
    timeSignature?: string;
    musicalKey?: string | null;
    lyricsEffect?: LyricsEffect;
    lyricsTransition?: LyricsTransition;
    lyricsAutoAdvance?: boolean;
    lyricsHighlight?: boolean;
    lyricsUpcomingLines?: 1 | 2 | 3;
    lyricsSpeed?: LyricsSpeed;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
  onSelect: () => void;
  onAddSection: (input: {
    kind: SongSectionKind;
    title: string;
    startBar: number;
    bars: number | null;
    lyrics: string | null;
    chords: string | null;
  }) => Promise<void>;
  onUpdateSection: (
    id: string,
    patch: {
      title?: string;
      lyrics?: string | null;
      chords?: string | null;
      startBar?: number;
      lyricCues?: PerformanceSection["lyricCues"];
    },
  ) => Promise<void>;
  onDeleteSection: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(song.title);
  const [kind, setKind] = useState<SongSectionKind>("verse");
  const [sectionTitle, setSectionTitle] = useState("Verse 1");
  const [startBar, setStartBar] = useState("1");
  const [lyrics, setLyrics] = useState("");
  const [chords, setChords] = useState("");

  return (
    <div className="mt-5 border-t border-white/8 pt-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="studio-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title.trim() && title !== song.title) {
              void onSave({
                title: title.trim(),
              });
            }
          }}
        />
        <button type="button" className="studio-action" onClick={onSelect}>
          {isActive ? "Active" : "Make active"}
        </button>
        <button type="button" className="studio-action" onClick={() => void onDelete()}>
          Delete
        </button>
      </div>

      <p className="mt-5 font-mono text-[10px] tracking-[0.2em] text-muted">
        LYRICS EFFECT
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {LYRICS_EFFECT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`studio-action ${
              song.lyricsEffect === option.id ? "border-accent bg-accent/15" : ""
            }`}
            onClick={() => void onSave({ lyricsEffect: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select
          className="studio-input"
          value={song.lyricsTransition}
          onChange={(event) =>
            void onSave({
              lyricsTransition: event.target.value === "instant" ? "instant" : "smooth",
            })
          }
        >
          <option value="smooth">Smooth</option>
          <option value="instant">Instant</option>
        </select>
        <select
          className="studio-input"
          value={song.lyricsSpeed}
          onChange={(event) =>
            void onSave({
              lyricsSpeed:
                event.target.value === "slow"
                  ? "slow"
                  : event.target.value === "fast"
                    ? "fast"
                    : "normal",
            })
          }
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
        <select
          className="studio-input"
          value={song.lyricsUpcomingLines}
          onChange={(event) =>
            void onSave({
              lyricsUpcomingLines: Number(event.target.value) as 1 | 2 | 3,
            })
          }
        >
          <option value={1}>1 upcoming</option>
          <option value={2}>2 upcoming</option>
          <option value={3}>3 upcoming</option>
        </select>
      </div>

      <p className="mt-5 font-mono text-[10px] tracking-[0.2em] text-muted">
        SECTIONS / LYRICS / CHORDS
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select
          className="studio-input"
          value={kind}
          onChange={(event) => setKind(event.target.value as SongSectionKind)}
        >
          {SECTION_KIND_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          className="studio-input"
          placeholder="Section title"
          value={sectionTitle}
          onChange={(event) => setSectionTitle(event.target.value)}
        />
        <input
          className="studio-input"
          placeholder="Start bar"
          value={startBar}
          onChange={(event) => setStartBar(event.target.value)}
        />
        <input
          className="studio-input"
          placeholder="Chords"
          value={chords}
          onChange={(event) => setChords(event.target.value)}
        />
        <textarea
          className="studio-input sm:col-span-2 min-h-24"
          placeholder="Lyrics"
          value={lyrics}
          onChange={(event) => setLyrics(event.target.value)}
        />
        <button
          type="button"
          className="studio-action justify-self-start"
          onClick={() => {
            void onAddSection({
              kind,
              title: sectionTitle,
              startBar: Math.max(1, Number(startBar) || 1),
              bars: null,
              lyrics,
              chords,
            });
            setLyrics("");
            setChords("");
          }}
        >
          Add section
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {sections.map((section) => (
          <li key={section.id} className="rounded-xl border border-white/8 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {section.title}{" "}
                <span className="font-mono text-xs text-muted">bar {section.startBar}</span>
              </p>
              <button
                type="button"
                className="font-mono text-[10px] text-beat"
                onClick={() => void onDeleteSection(section.id)}
              >
                Remove
              </button>
            </div>
            <textarea
              className="studio-input mt-2 min-h-16"
              defaultValue={section.chords ?? ""}
              placeholder="Chords"
              onBlur={(event) =>
                void onUpdateSection(section.id, { chords: event.target.value })
              }
            />
            <textarea
              className="studio-input mt-2 min-h-20"
              defaultValue={section.lyrics ?? ""}
              placeholder="Lyrics"
              onBlur={(event) =>
                void onUpdateSection(section.id, { lyrics: event.target.value })
              }
            />
            <textarea
              className="studio-input mt-2 min-h-16"
              defaultValue={formatCueSeconds(section.lyricCues)}
              placeholder="Optional line times in seconds from section start, one per lyric line: 0-4.2"
              onBlur={(event) => {
                const lines = splitLyricLines(section.lyrics);
                void onUpdateSection(section.id, {
                  lyricCues: parseCueSeconds(event.target.value, lines),
                });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
