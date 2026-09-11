"use client";

import { cn } from "@/utils/cn";
import type { MonitorHealth } from "@/lib/monitor/types";

type PerformanceAudioPanelProps = {
  monitorEnabled: boolean;
  busy: boolean;
  health: MonitorHealth;
  readyCount: number;
  connectedCount: number;
  initializing: boolean;
  error: string | null;
  onToggle: (enabled: boolean) => void;
};

export function PerformanceAudioPanel({
  monitorEnabled,
  busy,
  health,
  readyCount,
  connectedCount,
  initializing,
  error,
  onToggle,
}: PerformanceAudioPanelProps) {
  return (
    <section className="rounded-2xl border border-white/8 bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
        PERFORMANCE AUDIO
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/6 px-3 py-3">
          <dt className="font-mono text-[9px] tracking-[0.2em] text-muted">SYNC BEAT</dt>
          <dd className="mt-1 text-sm font-semibold">● ON</dd>
        </div>
        <div className="rounded-xl border border-white/6 px-3 py-3">
          <dt className="font-mono text-[9px] tracking-[0.2em] text-muted">MONITOR AUDIO</dt>
          <dd className="mt-1 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              {monitorEnabled ? "● ON" : "○ OFF"}
            </span>
            <button
              type="button"
              className="studio-action"
              disabled={busy}
              onClick={() => onToggle(!monitorEnabled)}
            >
              {monitorEnabled ? "Turn off" : "Turn on"}
            </button>
          </dd>
        </div>
      </dl>
      {monitorEnabled ? (
        <div className="mt-4 text-sm">
          {initializing ? (
            <p className="text-accent">Initializing Monitor Audio...</p>
          ) : (
            <p>
              <span className={cn(health === "READY" && "text-accent")}>
                {health}
              </span>
              {connectedCount > 0 ? (
                <span className="text-muted">
                  {" "}
                  · {readyCount} / {connectedCount} READY
                </span>
              ) : (
                <span className="text-muted"> · waiting for members</span>
              )}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Wired earphones with an inline microphone are recommended. Remote
            monitor audio has capture, network, and playback latency — this is
            not zero-latency and network ping is not headphone delay.
          </p>
          <p className="mt-2 text-xs text-muted">
            For live monitoring, use wired headphones/earphones to avoid
            feedback.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">
          Monitor Audio is optional. Leave it off to keep the synchronized click
          lightweight.
        </p>
      )}
      {error ? (
        <p className="mt-3 text-sm text-beat" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
