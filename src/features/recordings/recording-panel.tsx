"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatDurationMs,
  VoiceRecorder,
  type VoiceTakeBlob,
} from "@/lib/audio/recording";
import { micErrorMessage } from "@/lib/audio/mic";
import {
  deleteVoiceTake,
  renameVoiceTake,
  saveVoiceTake,
  signedRecordingUrl,
} from "@/features/recordings/client";
import { performerLabel, type VoiceTake } from "@/features/recordings/types";
import { useSongRecordings } from "@/features/recordings/use-song-recordings";

type RecordingPanelProps = {
  teamId: string;
  userId: string;
  sessionId: string | null;
  songId: string | null;
  songTitle: string | null;
  canControl: boolean;
  requestInputStream: () => Promise<{ stream: MediaStream; owned: boolean }>;
};

type Phase = "idle" | "recording" | "preview" | "saving";

export function RecordingPanel({
  teamId,
  userId,
  sessionId,
  songId,
  songTitle,
  canControl,
  requestInputStream,
}: RecordingPanelProps) {
  const { recordings, error: libraryError, supabase } = useSongRecordings(teamId, songId);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordedSongIdRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [take, setTake] = useState<VoiceTakeBlob | null>(null);
  const [title, setTitle] = useState("");
  const [playingId, setPlayingId] = useState<string | "preview" | null>(null);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const myTakes = recordings.filter((entry) => entry.userId === userId);
  const teamTakes = recordings.filter((entry) => entry.userId !== userId);

  async function startRecording() {
    if (!songId) {
      setError("Select a song before recording.");
      return;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setError(null);
    const recorder = recorderRef.current ?? new VoiceRecorder({
      onDuration: (ms) => setElapsedMs(ms),
      onError: (message) => setError(message),
    });
    recorderRef.current = recorder;
    if (!recorder.supported) {
      setError("This browser cannot record audio.");
      return;
    }
    try {
      const input = await requestInputStream();
      recordedSongIdRef.current = songId;
      await recorder.start(input.stream, input.owned);
      setElapsedMs(0);
      setTake(null);
      setPhase("recording");
    } catch (caught) {
      setPhase("idle");
      setError(micErrorMessage(caught, "record"));
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) {
      setPhase("idle");
      return;
    }
    const next = await recorder.stop();
    if (!next) {
      setPhase("idle");
      setError("That recording was empty. Try again.");
      return;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = URL.createObjectURL(next.blob);
    setTake(next);
    setTitle(canControl ? "Reference Take" : "");
    setPhase("preview");
  }

  function discardPreview() {
    recorderRef.current?.cancel();
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setTake(null);
    setPhase("idle");
    setElapsedMs(0);
    audioRef.current?.pause();
    setPlayingId(null);
    recordedSongIdRef.current = null;
  }

  async function saveTake() {
    const targetSongId = recordedSongIdRef.current ?? songId;
    if (!take || !targetSongId) {
      return;
    }
    setPhase("saving");
    setError(null);
    try {
      await saveVoiceTake(supabase, {
        teamId,
        songId: targetSongId,
        userId,
        sessionId,
        title: title.trim() || (canControl ? "Reference Take" : "Take"),
        take,
      });
      discardPreview();
    } catch (caught) {
      setPhase("preview");
      setError(caught instanceof Error ? caught.message : "Could not save the take.");
    }
  }

  async function playTake(entry: VoiceTake) {
    try {
      const url = await signedRecordingUrl(supabase, entry.storagePath);
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.onended = () => setPlayingId(null);
      await audio.play();
      setPlayingId(entry.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not play that take.");
    }
  }

  function togglePreview() {
    const url = previewUrlRef.current;
    if (!url) {
      return;
    }
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    if (playingId === "preview" && !audio.paused) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio.src = url;
    audio.onended = () => setPlayingId(null);
    void audio.play();
    setPlayingId("preview");
  }

  return (
    <div className="mt-6 border-t border-white/8 pt-5">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">RECORDINGS</p>
      <p className="mt-1 text-sm text-muted">
        {songTitle ? `Voice takes for ${songTitle}` : "Select a song to record a take."}
      </p>

      {phase === "recording" ? (
        <div className="mt-4 rounded-2xl border border-beat/40 bg-beat/10 px-4 py-4">
          <p className="font-mono text-[11px] tracking-[0.18em] text-beat">RECORDING</p>
          <p className="mt-2 font-mono text-4xl tabular-nums">{formatDurationMs(elapsedMs)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="studio-action" onClick={() => void stopRecording()}>
              Stop
            </button>
            <button type="button" className="studio-action" onClick={discardPreview}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {phase === "preview" || phase === "saving" ? (
        <div className="mt-4 rounded-2xl border border-white/12 bg-black/20 px-4 py-4">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted">YOUR RECORDING</p>
          <p className="mt-1 text-lg font-semibold">{songTitle}</p>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" className="studio-action" onClick={togglePreview}>
              {playingId === "preview" ? "Pause" : "Play"}
            </button>
            <span className="font-mono text-sm tabular-nums">
              {formatDurationMs(take?.durationMs ?? 0)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, take?.durationMs ?? 1)}
            defaultValue={0}
            className="mt-3 w-full"
            onChange={(event) => {
              const audio = audioRef.current;
              if (!audio) {
                return;
              }
              audio.currentTime = Number(event.target.value) / 1000;
            }}
          />
          <input
            className="studio-input mt-3"
            value={title}
            placeholder={canControl ? "Reference Take" : "Take name (optional)"}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="studio-action"
              disabled={phase === "saving"}
              onClick={() => void startRecording()}
            >
              Re-record
            </button>
            <button
              type="button"
              className="studio-action"
              disabled={phase === "saving"}
              onClick={() => void saveTake()}
            >
              {phase === "saving" ? "Saving…" : "Save take"}
            </button>
            <button
              type="button"
              className="studio-action"
              disabled={phase === "saving"}
              onClick={discardPreview}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {phase === "idle" ? (
        <button
          type="button"
          className="studio-action mt-4"
          disabled={!songId}
          onClick={() => void startRecording()}
        >
          Start recording
        </button>
      ) : null}

      {error || libraryError ? (
        <p className="mt-3 text-sm text-beat" role="alert">
          {error ?? libraryError}
        </p>
      ) : null}

      {songId ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TakeList
            label="MY TAKES"
            empty="No takes yet."
            takes={myTakes}
            userId={userId}
            canControl={canControl}
            playingId={playingId}
            onPlay={(entry) => void playTake(entry)}
            onRename={(entry, nextTitle) => renameVoiceTake(supabase, entry.id, nextTitle)}
            onDelete={(entry) => deleteVoiceTake(supabase, entry)}
            onError={setError}
          />
          <TakeList
            label="TEAM TAKES"
            empty="No team takes yet."
            takes={teamTakes}
            userId={userId}
            canControl={canControl}
            playingId={playingId}
            onPlay={(entry) => void playTake(entry)}
            onRename={(entry, nextTitle) => renameVoiceTake(supabase, entry.id, nextTitle)}
            onDelete={(entry) => deleteVoiceTake(supabase, entry)}
            onError={setError}
          />
        </div>
      ) : null}
    </div>
  );
}

function TakeList({
  label,
  empty,
  takes,
  userId,
  canControl,
  playingId,
  onPlay,
  onRename,
  onDelete,
  onError,
}: {
  label: string;
  empty: string;
  takes: VoiceTake[];
  userId: string;
  canControl: boolean;
  playingId: string | "preview" | null;
  onPlay: (take: VoiceTake) => void;
  onRename: (take: VoiceTake, title: string) => Promise<void>;
  onDelete: (take: VoiceTake) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.2em] text-muted">{label}</p>
      {takes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {takes.map((take) => {
            const canManage = take.userId === userId || canControl;
            return (
              <li
                key={take.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/8 px-3 py-2"
              >
                <button
                  type="button"
                  className="studio-action h-10"
                  onClick={() => onPlay(take)}
                >
                  {playingId === take.id ? "Playing" : "Play"}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {take.title}
                    <span className="ml-2 font-mono text-[10px] text-muted">
                      {performerLabel(take)}
                      {take.performerRole ? ` · ${take.performerRole}` : ""}
                    </span>
                  </p>
                  <p className="font-mono text-[10px] text-muted">
                    {formatDurationMs(take.durationMs)} ·{" "}
                    {new Date(take.createdAt).toLocaleString()}
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    className="font-mono text-[10px] text-muted"
                    onClick={() => {
                      const next = window.prompt("Rename take", take.title);
                      if (next == null) {
                        return;
                      }
                      void onRename(take, next).catch((caught) =>
                        onError(caught instanceof Error ? caught.message : "Could not rename."),
                      );
                    }}
                  >
                    Rename
                  </button>
                ) : null}
                {canManage ? (
                  <button
                    type="button"
                    className="font-mono text-[10px] text-beat"
                    onClick={() =>
                      void onDelete(take).catch((caught) =>
                        onError(caught instanceof Error ? caught.message : "Could not delete."),
                      )
                    }
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
