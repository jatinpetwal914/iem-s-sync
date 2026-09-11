"use client";

import type { MixerSnapshot, MixerChannelId, EqBand, EqChannelId } from "@/lib/audio/graph";
import { EQ_MAX_DB, EQ_MIN_DB } from "@/lib/audio/graph";
import { cn } from "@/utils/cn";

type MixerPanelProps = {
  mixer: MixerSnapshot;
  audioReady: boolean;
  onGain: (channel: MixerChannelId, percent: number) => void;
  onEq: (channel: EqChannelId, band: EqBand, db: number) => void;
  onMonitorEnable: () => void;
  onMonitorDisable: () => void;
  onMonitorMute: (muted: boolean) => void;
  onMonitorSolo: (solo: boolean) => void;
};

const CHANNELS: { id: MixerChannelId; label: string }[] = [
  { id: "master", label: "MASTER" },
  { id: "sync", label: "SYNC / CLICK" },
  { id: "monitor", label: "MONITOR" },
  { id: "backing", label: "BACKING" },
];

export function MixerPanel({
  mixer,
  audioReady,
  onGain,
  onEq,
  onMonitorEnable,
  onMonitorDisable,
  onMonitorMute,
  onMonitorSolo,
}: MixerPanelProps) {
  return (
    <details className="rounded-2xl border border-white/8 bg-surface p-5">
      <summary className="cursor-pointer font-mono text-[10px] tracking-[0.24em] text-muted">
        LOCAL MIXER
      </summary>
      <p className="mt-2 text-xs text-muted">
        These faders stay on this device. They never change the master session.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((channel) => (
          <label key={channel.id} className="block">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted">
              {channel.label} {Math.round(mixer[channel.id])}%
            </span>
            <input
              className="mt-2 w-full accent-[var(--accent)]"
              type="range"
              min={0}
              max={100}
              step={1}
              aria-label={`${channel.label} volume`}
              disabled={!audioReady}
              value={mixer[channel.id]}
              onChange={(event) => onGain(channel.id, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {mixer.monitorEnabled ? (
          <button
            type="button"
            className="studio-action"
            onClick={onMonitorDisable}
          >
            Disable monitor
          </button>
        ) : (
          <button
            type="button"
            className="studio-action"
            disabled={!audioReady}
            onClick={onMonitorEnable}
          >
            Enable monitor
          </button>
        )}
        <button
          type="button"
          className={cn(
            "studio-action",
            mixer.monitorMute && "border-beat text-beat",
          )}
          disabled={!mixer.monitorEnabled}
          onClick={() => onMonitorMute(!mixer.monitorMute)}
        >
          {mixer.monitorMute ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          className={cn(
            "studio-action",
            mixer.monitorSolo && "border-accent text-accent",
          )}
          disabled={!mixer.monitorEnabled}
          onClick={() => onMonitorSolo(!mixer.monitorSolo)}
        >
          {mixer.monitorSolo ? "Unsolo" : "Solo"}
        </button>
      </div>
      {mixer.monitorError ? (
        <p className="mt-3 text-sm text-beat" role="alert">
          {mixer.monitorError}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <EqStrip
          label="SYNC EQ"
          eq={mixer.eq.sync}
          disabled={!audioReady}
          onChange={(band, db) => onEq("sync", band, db)}
        />
        <EqStrip
          label="MONITOR EQ"
          eq={mixer.eq.monitor}
          disabled={!audioReady || !mixer.monitorEnabled}
          onChange={(band, db) => onEq("monitor", band, db)}
        />
        <EqStrip
          label="BACKING EQ"
          eq={mixer.eq.backing}
          disabled={!audioReady}
          onChange={(band, db) => onEq("backing", band, db)}
        />
      </div>
    </details>
  );
}

function EqStrip({
  label,
  eq,
  disabled,
  onChange,
}: {
  label: string;
  eq: MixerSnapshot["eq"]["sync"];
  disabled: boolean;
  onChange: (band: EqBand, db: number) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.2em] text-muted">{label}</p>
      {(["low", "mid", "high"] as EqBand[]).map((band) => (
        <label key={band} className="mt-2 block">
          <span className="font-mono text-[9px] tracking-[0.16em] text-muted">
            {band.toUpperCase()} {eq[band] >= 0 ? "+" : ""}
            {eq[band].toFixed(0)} dB
          </span>
          <input
            className="mt-1 w-full accent-[var(--accent)]"
            type="range"
            min={EQ_MIN_DB}
            max={EQ_MAX_DB}
            step={1}
            disabled={disabled}
            aria-label={`${label} ${band}`}
            value={eq[band]}
            onChange={(event) => onChange(band, Number(event.target.value))}
          />
        </label>
      ))}
    </div>
  );
}
