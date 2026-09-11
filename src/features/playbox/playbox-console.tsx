"use client";

import { genres } from "@/config/genres";
import { AudioGate } from "@/components/studio/audio-gate";
import { BeatIndicator } from "@/components/studio/beat-indicator";
import { LatencyDisclaimer } from "@/components/studio/latency-disclaimer";
import { MixerPanel } from "@/components/studio/mixer-panel";
import { PlayBoxMonitorPanel } from "@/components/studio/playbox-monitor-panel";
import { useMasterSession } from "@/hooks/use-master-session";
import { useMonitorAudio } from "@/hooks/use-monitor-audio";
import { SELF_SOURCE_ID, SYNC_SOURCE_ID } from "@/lib/monitor/types";
import { beatsPerBar, parseTimeSignature } from "@/lib/tempo/time-signature";
import { sessionTempoReadout } from "@/lib/tempo/format";
import { connectionLabel, sessionSyncLabel } from "@/lib/sync/clock";
import { getCountInView } from "@/lib/sync/count-in";
import { networkPingQuality } from "@/lib/devices/battery";
import type { MasterSession } from "@/lib/sessions/map-session";
import { DEFAULT_BPM } from "@/lib/tempo/constants";
import { PlayBoxBlockedState } from "@/features/playbox/playbox-blocked-state";
import { LyricsBoard } from "@/features/songs/lyrics-board";
import { usePerformanceLibrary } from "@/features/songs/use-performance-library";
import { sectionAtSongBar } from "@/features/songs/section-progress";

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
  const library = usePerformanceLibrary(teamId);
  const session = master.session;
  const audioReady =
    master.audio.state !== "UNINITIALIZED" &&
    master.audio.state !== "ERROR" &&
    !master.audio.suspended;
  const monitor = useMonitorAudio({
    teamId,
    userId,
    enabled: Boolean(session?.monitorAudioEnabled) && !master.membershipBlocked,
    audioReady,
    canControl: false,
    devices: master.devices,
    engine: {
      acquireCapture: (holder) => master.acquireCapture(holder),
      releaseCapture: master.releaseCapture,
      attachRemoteStream: master.attachRemoteStream,
      detachRemoteStream: master.detachRemoteStream,
      setRemoteMix: master.setRemoteMix,
      clearRemoteStreams: master.clearRemoteStreams,
    },
  });

  if (master.membershipBlocked) {
    return <PlayBoxBlockedState status="removed" teamId={teamId} />;
  }
  const bpm = session?.bpm ?? null;
  const timeSignature = session?.timeSignature ?? "4/4";
  const sampleRate = session?.sampleRate ?? 44100;
  const tempo = bpm == null ? null : sessionTempoReadout(bpm, sampleRate, timeSignature);
  const parsed = parseTimeSignature(timeSignature);
  const barLength = parsed.ok ? beatsPerBar(parsed.value) : 4;
  const genre = genres.find((entry) => entry.id === session?.genreId);
  const syncLabel = sessionSyncLabel({
    realtimeState: master.realtimeState,
    sampleCount: master.clock.sampleCount,
    quality: master.localSync,
  });
  const synced = syncLabel === "SYNCED" ? "✓ SYNCED" : syncLabel;
  const countIn = getCountInView(
    master.position,
    session?.countInBars ?? 0,
    barLength,
  );
  const song =
    library.songs.find((entry) => entry.id === session?.activeSongId) ?? null;
  const section = sectionAtSongBar(
    library.sections.filter((entry) => entry.songId === song?.id),
    countIn.songBarNumber,
  );
  const pingQuality = networkPingQuality(master.clock.roundTripMs);
  const devicesOnline = new Set(
    master.devices
      .filter((device) => device.connection === "CONNECTED" || device.connection === "UNSTABLE")
      .map((device) => device.userId),
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 overflow-x-hidden px-4 py-5 landscape:max-w-5xl landscape:flex-row landscape:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="text-center landscape:text-left">
          <p className="font-mono text-[11px] tracking-[0.3em] text-muted">{teamName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">IEM PLAYBOX</h1>
          <p className="mt-2 font-mono text-[11px] tracking-[0.22em] text-accent">
            MASTER CONTROLLED
          </p>
        </div>

        <AudioGate audio={master.audio} onActivate={() => void master.activateAudio()} />
        <LyricsBoard
          song={song}
          section={section}
          sections={library.sections.filter((entry) => entry.songId === song?.id)}
          position={master.position}
          bpm={bpm ?? DEFAULT_BPM}
          beatsPerBar={barLength}
          countInBars={session?.countInBars ?? 0}
          teamId={teamId}
          userId={userId}
          sessionId={session?.id ?? null}
          canControl={false}
          requestInputStream={() => master.requestInputStream()}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="rounded-3xl border border-white/8 bg-surface px-4 py-6">
          <p className="text-center font-mono text-[10px] tracking-[0.24em] text-muted">
            MASTER BPM
          </p>
          <p className="text-center font-mono text-[clamp(2.75rem,18vw,3.75rem)] font-semibold tabular-nums">
            {bpm ?? "—"}
          </p>
          <div className="mt-6 flex justify-center">
            <BeatIndicator
              position={master.position}
              beatsPerBar={barLength}
              countIn={countIn}
            />
          </div>
        </div>

        <PlayBoxMonitorPanel
          enabled={Boolean(session?.monitorAudioEnabled)}
          audioReady={audioReady}
          health={monitor.health}
          micActive={monitor.micActive || master.audio.mixer.monitorEnabled}
          error={monitor.error}
          locked={monitor.locked}
          roster={monitor.roster}
          userId={userId}
          sources={monitor.mergedMine}
          devicesOnline={devicesOnline}
          onPatch={(sourceId, patch) => {
            monitor.patchLocalSource(sourceId, patch);
            if (sourceId === SYNC_SOURCE_ID && patch.gain != null) {
              master.setMixerGain("sync", patch.gain);
            }
            if (sourceId === SELF_SOURCE_ID && patch.gain != null) {
              master.setMixerGain("monitor", patch.gain);
            }
            if (sourceId === SELF_SOURCE_ID && patch.muted != null) {
              master.setMonitorMute(patch.muted);
            }
            if (sourceId === SELF_SOURCE_ID && patch.solo != null) {
              master.setMonitorSolo(patch.solo);
            }
          }}
        />

        <MixerPanel
          mixer={master.audio.mixer}
          audioReady={audioReady}
          onGain={master.setMixerGain}
          onEq={master.setMixerEq}
          onMonitorEnable={() => void master.enableMonitor()}
          onMonitorDisable={master.disableMonitor}
          onMonitorMute={master.setMonitorMute}
          onMonitorSolo={master.setMonitorSolo}
        />

        <dl className="grid grid-cols-2 gap-3">
          <Stat label="BPS" value={tempo?.bpsLabel ?? "—"} />
          <Stat label="INTERVAL" value={tempo?.intervalLabel ?? "—"} />
          <Stat label="GENRE" value={genre?.shortName ?? "—"} />
          <Stat label="TIME SIGNATURE" value={session ? timeSignature : "—"} />
          <Stat label="CURRENT BEAT" value={String(master.position.beatInBar)} />
          <Stat label="CURRENT BAR" value={String(countIn.songBarNumber)} />
          <Stat label="STATUS" value={master.appStatus} />
          <Stat label="SYNC" value={synced} />
          <Stat
            label="NETWORK LATENCY"
            value={`${Math.round(master.clock.roundTripMs)}ms${
              pingQuality ? ` · ${pingQuality}` : ""
            }`}
          />
          <Stat label="AUDIO" value={master.audio.suspended ? "SUSPENDED" : master.audio.state} />
          <Stat label="LINK" value={connectionLabel(master.localSync)} />
          <Stat label="SESSION" value={session ? "LIVE" : "WAITING"} />
        </dl>

        <LatencyDisclaimer />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface px-3 py-3">
      <dt className="font-mono text-[9px] tracking-[0.2em] text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  );
}
