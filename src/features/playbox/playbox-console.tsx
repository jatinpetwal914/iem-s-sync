"use client";

import { genres } from "@/config/genres";
import { AudioGate } from "@/components/studio/audio-gate";
import { BeatIndicator } from "@/components/studio/beat-indicator";
import { LatencyDisclaimer } from "@/components/studio/latency-disclaimer";
import { useMasterSession } from "@/hooks/use-master-session";
import { beatsPerBar, parseTimeSignature } from "@/lib/tempo/time-signature";
import { sessionTempoReadout } from "@/lib/tempo/format";
import { connectionLabel } from "@/lib/sync/clock";
import type { MasterSession } from "@/lib/sessions/map-session";
import { PlayBoxBlockedState } from "@/features/playbox/playbox-blocked-state";

type PlayBoxConsoleProps = {
  teamId: string;
  teamName: string;
  userId: string;
  initialSession: MasterSession | null;
};

export function PlayBoxConsole({
  teamId,
  teamName,
  userId,
  initialSession,
}: PlayBoxConsoleProps) {
  const master = useMasterSession({
    teamId,
    userId,
    canControl: false,
    initialSession,
  });

  if (master.membershipBlocked) {
    return <PlayBoxBlockedState status="removed" teamId={teamId} />;
  }

  const session = master.session;
  const bpm = session?.bpm ?? null;
  const timeSignature = session?.timeSignature ?? "4/4";
  const sampleRate = session?.sampleRate ?? 44100;
  const tempo = bpm == null ? null : sessionTempoReadout(bpm, sampleRate, timeSignature);
  const parsed = parseTimeSignature(timeSignature);
  const barLength = parsed.ok ? beatsPerBar(parsed.value) : 4;
  const genre = genres.find((entry) => entry.id === session?.genreId);
  const synced =
    master.localSync === "EXCELLENT" || master.localSync === "GOOD"
      ? "✓ SYNCHRONIZED"
      : master.localSync;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 overflow-x-hidden px-4 py-5">
      <div className="text-center">
        <p className="font-mono text-[11px] tracking-[0.3em] text-muted">{teamName}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">IEM PLAYBOX</h1>
        <p className="mt-2 font-mono text-[11px] tracking-[0.22em] text-accent">
          MASTER CONTROLLED
        </p>
      </div>

      <AudioGate audio={master.audio} onActivate={() => void master.activateAudio()} />

      <div className="rounded-3xl border border-white/8 bg-[#0b0e16] px-4 py-6">
        <p className="text-center font-mono text-[10px] tracking-[0.24em] text-muted">
          MASTER BPM
        </p>
        <p className="text-center font-mono text-[clamp(2.75rem,18vw,3.75rem)] font-semibold tabular-nums">
          {bpm ?? "—"}
        </p>
        <div className="mt-6 flex justify-center">
          <BeatIndicator position={master.position} beatsPerBar={barLength} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Stat label="BPS" value={tempo?.bpsLabel ?? "—"} />
        <Stat label="INTERVAL" value={tempo?.intervalLabel ?? "—"} />
        <Stat label="GENRE" value={genre?.shortName ?? "—"} />
        <Stat label="TIME SIGNATURE" value={session ? timeSignature : "—"} />
        <Stat label="CURRENT BEAT" value={String(master.position.beatInBar)} />
        <Stat label="CURRENT BAR" value={String(master.position.barNumber)} />
        <Stat label="STATUS" value={master.appStatus} />
        <Stat label="SYNC" value={synced} />
        <Stat
          label="LATENCY"
          value={`${Math.round(master.clock.estimatedLatencyMs)}ms`}
        />
        <Stat label="AUDIO" value={master.audio.suspended ? "SUSPENDED" : master.audio.state} />
        <Stat label="LINK" value={connectionLabel(master.localSync)} />
        <Stat label="SESSION" value={session ? "LIVE" : "WAITING"} />
      </dl>

      <LatencyDisclaimer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0b0e16] px-3 py-3">
      <dt className="font-mono text-[9px] tracking-[0.2em] text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  );
}
