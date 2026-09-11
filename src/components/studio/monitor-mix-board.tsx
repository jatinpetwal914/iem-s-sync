"use client";

import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { clampPercent } from "@/lib/audio/graph";
import {
  SELF_SOURCE_ID,
  SYNC_SOURCE_ID,
  type MonitorMixRecord,
  type MonitorRosterMember,
  type MonitorSources,
  type MonitorSourceState,
} from "@/lib/monitor/types";
import { applyMonitorPreset, MONITOR_PRESETS, type MonitorPresetId } from "@/lib/monitor/presets";
import { parseSourceState } from "@/lib/monitor/mix";

type MonitorMixBoardProps = {
  userId: string;
  roster: MonitorRosterMember[];
  mixes: MonitorMixRecord[];
  devicesOnline: Set<string>;
  saving: boolean;
  saveError: string | null;
  onSave: (receiverId: string, sources: MonitorSources, locked: boolean) => void;
};

export function MonitorMixBoard({
  userId,
  roster,
  mixes,
  devicesOnline,
  saving,
  saveError,
  onSave,
}: MonitorMixBoardProps) {
  const [receiverId, setReceiverId] = useState<string | null>(roster[0]?.userId ?? userId);
  const receiver = roster.find((member) => member.userId === receiverId) ?? roster[0] ?? null;
  const mix = mixes.find((item) => item.receiverId === receiver?.userId);

  if (roster.length === 0) {
    return (
      <section className="rounded-2xl border border-white/8 bg-surface p-5">
        <p className="font-mono text-[10px] tracking-[0.24em] text-muted">MONITOR MIXES</p>
        <p className="mt-3 text-sm text-muted">No approved members to route yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">MONITOR MIXES</p>
      <ul className="mt-4 grid gap-2">
        {roster.map((member, index) => (
          <li key={member.userId}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left",
                receiver?.userId === member.userId
                  ? "border-accent/50 bg-accent/10"
                  : "border-white/6",
              )}
              onClick={() => setReceiverId(member.userId)}
            >
              <span>
                <span className="font-mono text-[10px] text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>{" "}
                <span className="font-semibold">{member.displayName}</span>
                <span className="ml-2 font-mono text-[10px] text-muted">{member.role}</span>
              </span>
              <span className="font-mono text-[10px] text-muted">
                {devicesOnline.has(member.userId) ? "● Connected" : "○ Offline"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {receiver ? (
        <MixEditor
          key={`${receiver.userId}:${mix?.revision ?? 0}`}
          receiver={receiver}
          roster={roster}
          devicesOnline={devicesOnline}
          initialSources={mix?.sources ?? defaultSources()}
          initialLocked={mix?.locked ?? false}
          saving={saving}
          saveError={saveError}
          onSave={onSave}
        />
      ) : null}
    </section>
  );
}

function MixEditor({
  receiver,
  roster,
  devicesOnline,
  initialSources,
  initialLocked,
  saving,
  saveError,
  onSave,
}: {
  receiver: MonitorRosterMember;
  roster: MonitorRosterMember[];
  devicesOnline: Set<string>;
  initialSources: MonitorSources;
  initialLocked: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: (receiverId: string, sources: MonitorSources, locked: boolean) => void;
}) {
  const [sources, setSources] = useState<MonitorSources>(initialSources);
  const [locked, setLocked] = useState(initialLocked);
  const [preset, setPreset] = useState<MonitorPresetId>("custom");

  const rows = useMemo(
    () => mixRows(receiver, roster, sources, devicesOnline),
    [devicesOnline, receiver, roster, sources],
  );

  function patch(id: string, next: Partial<MonitorSourceState>) {
    setSources((current) => ({
      ...current,
      [id]: { ...parseSourceState(current[id]), ...next },
    }));
    setPreset("custom");
  }

  return (
    <div className="mt-5 border-t border-white/8 pt-5">
      <p className="text-lg font-semibold">{receiver.displayName}</p>
      <p className="font-mono text-[10px] text-muted">
        {receiver.role} · ID {shortId(receiver.membershipId)}
      </p>
      <p className="mt-2 font-mono text-[10px] text-muted">
        Connection: {devicesOnline.has(receiver.userId) ? "● Connected" : "○ Offline"}
      </p>

      <label className="mt-4 block">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted">PRESET</span>
        <select
          className="studio-input mt-2"
          aria-label="Monitor mix preset"
          value={preset}
          onChange={(event) => {
            const next = event.target.value as MonitorPresetId;
            setPreset(next);
            if (next !== "custom") {
              setSources(applyMonitorPreset(next, receiver.userId, roster));
            }
          }}
        >
          {MONITOR_PRESETS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <p className="mt-5 font-mono text-[10px] tracking-[0.24em] text-muted">MY MIX</p>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-white/6 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {row.label}
                {!row.local && !row.online ? (
                  <span className="ml-2 font-mono text-[10px] text-muted">○ Offline</span>
                ) : null}
              </p>
              <p className="font-mono text-[10px] text-muted">{Math.round(row.state.gain)}%</p>
            </div>
            <input
              className="mt-2 w-full accent-[var(--accent)]"
              type="range"
              min={0}
              max={100}
              step={1}
              aria-label={`${row.label} volume`}
              value={row.state.gain}
              onChange={(event) => patch(row.id, { gain: Number(event.target.value) })}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={cn("studio-action", row.state.muted && "border-beat text-beat")}
                onClick={() => patch(row.id, { muted: !row.state.muted })}
              >
                {row.state.muted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                className={cn("studio-action", row.state.solo && "border-accent text-accent")}
                onClick={() => patch(row.id, { solo: !row.state.solo })}
              >
                {row.state.solo ? "Unsolo" : "Solo"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={locked}
          onChange={(event) => setLocked(event.target.checked)}
        />
        Admin locked (member cannot change this mix locally)
      </label>

      <button
        type="button"
        className="studio-action mt-4"
        disabled={saving}
        onClick={() => onSave(receiver.userId, sources, locked)}
      >
        {saving ? "Saving…" : "Save mix / Apply to member"}
      </button>
      {saveError ? (
        <p className="mt-2 text-sm text-beat" role="alert">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}

function defaultSources(): MonitorSources {
  return {
    [SELF_SOURCE_ID]: { gain: 100, muted: false, solo: false },
    [SYNC_SOURCE_ID]: { gain: 60, muted: false, solo: false },
  };
}

function mixRows(
  receiver: MonitorRosterMember,
  roster: MonitorRosterMember[],
  sources: MonitorSources,
  devicesOnline: Set<string>,
) {
  const rows: {
    id: string;
    label: string;
    local: boolean;
    online: boolean;
    state: MonitorSourceState;
  }[] = [
    {
      id: SELF_SOURCE_ID,
      label: `${receiver.displayName} — Self`,
      local: true,
      online: true,
      state: parseSourceState(sources[SELF_SOURCE_ID] ?? { gain: 100, muted: false, solo: false }),
    },
  ];
  for (const member of roster) {
    if (member.userId === receiver.userId) {
      continue;
    }
    rows.push({
      id: member.userId,
      label: `${member.displayName} — ${member.role}`,
      local: false,
      online: devicesOnline.has(member.userId),
      state: parseSourceState(sources[member.userId]),
    });
  }
  rows.push({
    id: SYNC_SOURCE_ID,
    label: "Sync Click",
    local: true,
    online: true,
    state: parseSourceState(sources[SYNC_SOURCE_ID] ?? { gain: 60, muted: false, solo: false }),
  });
  return rows.map((row) => ({
    ...row,
    state: {
      ...row.state,
      gain: clampPercent(row.state.gain),
    },
  }));
}

function shortId(value: string): string {
  return `#${value.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
