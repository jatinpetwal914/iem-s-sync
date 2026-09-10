"use client";

import { useState, type ReactNode } from "react";
import { genres } from "@/config/genres";
import { AudioGate } from "@/components/studio/audio-gate";
import { BeatIndicator } from "@/components/studio/beat-indicator";
import { ConnectedMembersPanel } from "@/components/studio/connected-members";
import { LatencyDisclaimer } from "@/components/studio/latency-disclaimer";
import { TransportBar } from "@/components/studio/transport-bar";
import { useMasterSession } from "@/hooks/use-master-session";
import { defaultBeatPattern, serializeBeatPattern } from "@/lib/sessions/pattern";
import { TIME_SIGNATURE_OPTIONS } from "@/lib/sessions/time-signatures";
import { beatsPerBar, parseTimeSignature } from "@/lib/tempo/time-signature";
import { sessionTempoReadout } from "@/lib/tempo/format";
import { buildMusicPrompt } from "@/lib/prompts/music-prompt";
import type { MasterSession } from "@/lib/sessions/map-session";
import { BPM_MAX, BPM_MIN, DEFAULT_BPM } from "@/lib/tempo/constants";
import { parseBpmInput } from "@/lib/tempo/validation";

type BeatControlConsoleProps = {
  teamId: string;
  teamName: string;
  userId: string;
  initialSession: MasterSession | null;
};

export function BeatControlConsole({
  teamId,
  teamName,
  userId,
  initialSession,
}: BeatControlConsoleProps) {
  const master = useMasterSession({
    teamId,
    userId,
    canControl: true,
    initialSession,
  });
  const session = master.session;
  const bpm = session?.bpm ?? DEFAULT_BPM;
  const [bpmDraft, setBpmDraft] = useState<string | null>(null);
  const [bpmIssue, setBpmIssue] = useState<string | null>(null);
  const bpmField = bpmDraft ?? String(bpm);
  const timeSignature = session?.timeSignature ?? "4/4";
  const sampleRate = session?.sampleRate ?? 44100;
  const tempo = sessionTempoReadout(bpm, sampleRate, timeSignature);
  const parsed = parseTimeSignature(timeSignature);
  const barLength = parsed.ok ? beatsPerBar(parsed.value) : 4;
  const pattern = session?.beatPattern ?? [1, 0, 0, 0];
  const genre = genres.find((entry) => entry.id === session?.genreId) ?? genres[3];
  const prompt = buildMusicPrompt({
    userBpm: tempo.bpm,
    calculatedBps: tempo.bps,
    genre: genre?.name ?? "House",
    intervalMs: tempo.intervalMs,
    timeSignature,
    pattern,
    sampleRate: tempo.sampleRate,
    samplesPerBeat: tempo.samplesPerBeat,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 overflow-x-hidden px-4 py-6 sm:px-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-accent">
            MASTER BEAT CONTROL
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{teamName}</h1>
        </div>
        <div className="flex flex-wrap gap-3 font-mono text-[10px] tracking-[0.18em] text-muted">
          <Badge label="ACTIVE SESSION" value={session ? session.id.slice(0, 8) : "NONE"} />
          <Badge label="STATUS" value={master.appStatus} />
          <Badge label="BPM" value={String(bpm)} />
          <Badge label="GENRE" value={genre?.shortName ?? "House"} />
          <Badge label="LINK" value={master.realtimeState.toUpperCase()} />
        </div>
      </header>

      <AudioGate audio={master.audio} onActivate={() => void master.activateAudio()} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/8 bg-surface p-5">
          <Field label="GENRE">
            <select
              className="studio-input"
              aria-label="Genre"
              value={session?.genreId ?? "pop-synthwave-house"}
              onChange={(event) =>
                void master.runCommand("configure", { genreId: event.target.value })
              }
            >
              {genres.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.shortName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="BPM">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="studio-step"
                aria-label="Decrease BPM"
                disabled={master.busy}
                onClick={() =>
                  void master.runCommand("configure", { bpm: Math.max(BPM_MIN, bpm - 1) })
                }
              >
                −
              </button>
              <input
                className="studio-input w-28 text-center font-mono text-2xl"
                type="text"
                inputMode="decimal"
                aria-label="Master BPM"
                aria-invalid={bpmIssue ? true : undefined}
                min={BPM_MIN}
                max={BPM_MAX}
                value={bpmField}
                onChange={(event) => {
                  setBpmDraft(event.target.value);
                  setBpmIssue(null);
                }}
                onBlur={() => {
                  const parsed = parseBpmInput(bpmField);
                  if (!parsed.ok) {
                    setBpmIssue(parsed.issues[0] ?? "BPM is invalid");
                    setBpmDraft(null);
                    return;
                  }
                  setBpmDraft(null);
                  if (parsed.value !== bpm) {
                    void master.runCommand("configure", { bpm: parsed.value });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
              <button
                type="button"
                className="studio-step"
                aria-label="Increase BPM"
                disabled={master.busy}
                onClick={() =>
                  void master.runCommand("configure", { bpm: Math.min(BPM_MAX, bpm + 1) })
                }
              >
                +
              </button>
            </div>
            {bpmIssue ? (
              <p className="mt-2 text-sm text-beat" role="alert">
                {bpmIssue}
              </p>
            ) : null}
          </Field>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="BPS" value={tempo.bpsLabel} />
            <Metric label="BEAT INTERVAL" value={tempo.intervalLabel} />
            <Metric label="SAMPLE RATE" value={`${tempo.sampleRate} Hz`} />
            <Metric label="SAMPLES PER BEAT" value={tempo.samplesLabel} />
          </dl>

          <Field label="TIME SIGNATURE">
            <select
              className="studio-input"
              aria-label="Time signature"
              value={timeSignature}
              onChange={(event) => {
                const next = event.target.value;
                const parsedSignature = parseTimeSignature(next);
                const bar = parsedSignature.ok
                  ? beatsPerBar(parsedSignature.value)
                  : 4;
                void master.runCommand("configure", {
                  timeSignature: next,
                  beatPattern: serializeBeatPattern(defaultBeatPattern(bar)),
                });
              }}
            >
              {TIME_SIGNATURE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="BEAT PATTERN">
            <div className="flex flex-wrap gap-2">
              {pattern.map((step, index) => (
                <button
                  key={`${index}-${step}`}
                  type="button"
                  className={`h-12 min-w-10 rounded-lg border font-mono text-sm sm:min-w-12 ${
                    step === 1
                      ? "border-accent bg-accent/20 text-accent"
                      : "border-white/12 text-muted"
                  }`}
                  aria-label={`Beat ${index + 1} ${step === 1 ? "accent" : "normal"}`}
                  aria-pressed={step === 1}
                  onClick={() => {
                    const next = [...pattern];
                    next[index] = step === 1 ? 0 : 1;
                    void master.runCommand("configure", {
                      beatPattern: serializeBeatPattern(next),
                    });
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-8">
            <TransportBar
              status={session?.status ?? "stopped"}
              busy={master.busy}
              onPlay={() => void master.runCommand("play")}
              onPause={() => void master.runCommand("pause")}
              onResume={() => void master.runCommand("resume")}
              onStop={() => void master.runCommand("stop")}
              onReset={() => void master.runCommand("reset")}
            />
            {master.controlError ? (
              <p className="mt-3 text-sm text-beat" role="alert">
                {master.controlError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col items-center gap-6 rounded-2xl border border-white/8 bg-surface p-5">
          <BeatIndicator position={master.position} beatsPerBar={barLength} />
          <div className="grid w-full grid-cols-2 gap-4 text-center">
            <Metric label="CURRENT BAR" value={String(master.position.barNumber)} />
            <Metric label="CURRENT BEAT" value={String(master.position.beatInBar)} />
          </div>
        </section>
      </div>

      <ConnectedMembersPanel devices={master.devices} />

      <section className="rounded-2xl border border-white/8 bg-surface p-5">
        <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
          MUSIC PROMPT ENGINE
        </p>
        <pre className="mt-4 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted">
          {prompt}
        </pre>
      </section>

      <LatencyDisclaimer />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-5 block">
      <span className="font-mono text-[10px] tracking-[0.24em] text-muted">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.2em] text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-lg text-foreground">{value}</dd>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label} {value}
    </span>
  );
}
