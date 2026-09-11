"use client";

import { cn } from "@/utils/cn";
import { SELF_SOURCE_ID, SYNC_SOURCE_ID } from "@/lib/monitor/types";
import type { MonitorHealth, MonitorRosterMember, MonitorSources } from "@/lib/monitor/types";
import { parseSourceState } from "@/lib/monitor/mix";

type PlayBoxMonitorPanelProps = {
  enabled: boolean;
  audioReady: boolean;
  health: MonitorHealth;
  micActive: boolean;
  error: string | null;
  locked: boolean;
  roster: MonitorRosterMember[];
  userId: string;
  sources: MonitorSources;
  devicesOnline: Set<string>;
  onPatch: (sourceId: string, patch: { gain?: number; muted?: boolean; solo?: boolean }) => void;
};

export function PlayBoxMonitorPanel({
  enabled,
  audioReady,
  health,
  micActive,
  error,
  locked,
  roster,
  userId,
  sources,
  devicesOnline,
  onPatch,
}: PlayBoxMonitorPanelProps) {
  const self = roster.find((member) => member.userId === userId);

  return (
    <section className="rounded-2xl border border-white/8 bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">MONITOR AUDIO</p>
      {!enabled ? (
        <p className="mt-3 text-sm text-muted">○ Disabled by Admin</p>
      ) : (
        <>
          <p className="mt-3 text-sm">
            {health === "READY" ? "● Connected" : health === "CONNECTING" ? "● Connecting" : `⚠ ${health}`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {micActive ? "🎙 Microphone Active" : "🎙 Microphone Inactive"}
            {" · "}
            Wired earphones recommended. Not zero-latency.
          </p>
          {!audioReady ? (
            <p className="mt-2 text-sm text-accent">Activate audio to hear remote monitors.</p>
          ) : null}
          {error ? (
            <p className="mt-2 text-sm text-beat" role="alert">
              {error}
            </p>
          ) : null}
          <ul className="mt-4 flex flex-col gap-3">
            <SourceRow
              label={`🎙 ${self?.displayName ?? "Me"} — Self`}
              state={parseSourceState(sources[SELF_SOURCE_ID] ?? { gain: 100, muted: false, solo: false })}
              disabled={locked}
              hint="Self stays on this device. Enable Local Mixer → Monitor to hear yourself."
              onPatch={(patch) => onPatch(SELF_SOURCE_ID, patch)}
            />
            {roster
              .filter((member) => member.userId !== userId)
              .map((member) => (
                <SourceRow
                  key={member.userId}
                  label={`${member.displayName} — ${member.role}${
                    devicesOnline.has(member.userId) ? "" : " · Offline"
                  }`}
                  state={parseSourceState(sources[member.userId])}
                  disabled={locked}
                  onPatch={(patch) => onPatch(member.userId, patch)}
                />
              ))}
            <SourceRow
              label="🔊 Sync Click"
              state={parseSourceState(sources[SYNC_SOURCE_ID] ?? { gain: 60, muted: false, solo: false })}
              disabled={locked}
              hint="Click is generated locally. Use Local Mixer → Sync for the live fader if this mix is locked."
              onPatch={(patch) => onPatch(SYNC_SOURCE_ID, patch)}
            />
          </ul>
        </>
      )}
    </section>
  );
}

function SourceRow({
  label,
  state,
  disabled,
  hint,
  onPatch,
}: {
  label: string;
  state: { gain: number; muted: boolean; solo: boolean };
  disabled: boolean;
  hint?: string;
  onPatch: (patch: { gain?: number; muted?: boolean; solo?: boolean }) => void;
}) {
  return (
    <li className="rounded-xl border border-white/6 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <p className="font-mono text-[10px] text-muted">{Math.round(state.gain)}%</p>
      </div>
      <input
        className="mt-2 w-full accent-[var(--accent)]"
        type="range"
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        aria-label={`${label} volume`}
        value={state.gain}
        onChange={(event) => onPatch({ gain: Number(event.target.value) })}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={cn("studio-action", state.muted && "border-beat text-beat")}
          disabled={disabled}
          onClick={() => onPatch({ muted: !state.muted })}
        >
          {state.muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          className={cn("studio-action", state.solo && "border-accent text-accent")}
          disabled={disabled}
          onClick={() => onPatch({ solo: !state.solo })}
        >
          {state.solo ? "Unsolo" : "Solo"}
        </button>
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </li>
  );
}
