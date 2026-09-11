"use client";

import { useMemo, useState } from "react";
import type { PerformanceSection, PerformanceSong } from "@/features/songs/section-kinds";
import type { PlaybackPosition } from "@/lib/sync/types";
import {
  DEFAULT_LYRICS_SETTINGS,
  type LyricsSettings,
} from "@/lib/lyrics/types";
import { lyricViewFromTimeline } from "@/lib/lyrics/timing";
import { clearLyricsPrefs, loadLyricsPrefs, saveLyricsPrefs } from "@/lib/lyrics/prefs";
import { LyricsDisplay } from "@/features/songs/lyrics-display";
import { LyricsEffectsPanel } from "@/features/songs/lyrics-effects-panel";
import { RecordingPanel } from "@/features/recordings/recording-panel";

type LyricsBoardProps = {
  song: PerformanceSong | null;
  section: PerformanceSection | null;
  sections: PerformanceSection[];
  position: PlaybackPosition;
  bpm: number;
  beatsPerBar: number;
  countInBars: number;
  teamId: string;
  userId: string;
  sessionId: string | null;
  canControl: boolean;
  requestInputStream: () => Promise<{ stream: MediaStream; owned: boolean }>;
};

function settingsFromSong(song: PerformanceSong | null): LyricsSettings {
  if (!song) {
    return DEFAULT_LYRICS_SETTINGS;
  }
  return {
    effect: song.lyricsEffect,
    transition: song.lyricsTransition,
    autoAdvance: song.lyricsAutoAdvance,
    highlight: song.lyricsHighlight,
    upcomingLines: song.lyricsUpcomingLines,
    speed: song.lyricsSpeed,
  };
}

export function LyricsBoard({
  song,
  section,
  sections,
  position,
  bpm,
  beatsPerBar,
  countInBars,
  teamId,
  userId,
  sessionId,
  canControl,
  requestInputStream,
}: LyricsBoardProps) {
  const songSettings = settingsFromSong(song);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<LyricsSettings | null>(null);
  const settings = localSettings ?? songSettings;
  const view = useMemo(
    () =>
      lyricViewFromTimeline({
        section,
        sections,
        position,
        bpm,
        beatsPerBar,
        countInBars,
        settings,
      }),
    [section, sections, position, bpm, beatsPerBar, countInBars, settings],
  );

  function applyLocal(patch: Partial<LyricsSettings>) {
    const next = { ...settings, ...patch };
    setLocalSettings(next);
    saveLyricsPrefs(teamId, next);
  }

  return (
    <section className="rounded-3xl border border-white/8 bg-surface px-4 py-5 sm:px-6">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">CURRENT SONG</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {song?.title ?? "Waiting for the set"}
      </h2>
      <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-accent">
        {song
          ? `${song.musicalKey ?? "KEY —"} · ${song.timeSignature}${
              song.bpm ? ` · ${song.bpm} BPM` : ""
            }`
          : "Admin selects a song"}
      </p>
      <p className="mt-5 font-mono text-[10px] tracking-[0.24em] text-muted">
        CURRENT SECTION
      </p>
      <p className="mt-1 text-xl font-semibold">{section?.title ?? "—"}</p>

      <LyricsDisplay
        chords={section?.chords ?? null}
        fallbackLyrics={section?.lyrics ?? null}
        view={view}
        settings={settings}
      />

      <LyricsEffectsPanel
        open={effectsOpen}
        settings={settings}
        usingSongDefault={localSettings == null}
        onToggle={() => {
          if (!effectsOpen) {
            const prefs = loadLyricsPrefs(teamId);
            if (prefs) {
              setLocalSettings(prefs);
            }
          }
          setEffectsOpen((open) => !open);
        }}
        onChange={applyLocal}
        onUseSongDefault={() => {
          setLocalSettings(null);
          clearLyricsPrefs(teamId);
        }}
      />

      <RecordingPanel
        teamId={teamId}
        userId={userId}
        sessionId={sessionId}
        songId={song?.id ?? null}
        songTitle={song?.title ?? null}
        canControl={canControl}
        requestInputStream={requestInputStream}
      />
    </section>
  );
}
