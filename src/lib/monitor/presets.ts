import { SELF_SOURCE_ID, SYNC_SOURCE_ID, type MonitorSources } from "@/lib/monitor/types";
import type { MonitorRosterMember } from "@/lib/monitor/types";

export type MonitorPresetId =
  | "vocalist"
  | "guitarist"
  | "drummer"
  | "keyboardist"
  | "flutist"
  | "custom";

export const MONITOR_PRESETS: { id: MonitorPresetId; label: string }[] = [
  { id: "vocalist", label: "Vocalist" },
  { id: "guitarist", label: "Guitarist" },
  { id: "drummer", label: "Drummer" },
  { id: "keyboardist", label: "Keyboardist" },
  { id: "flutist", label: "Flutist" },
  { id: "custom", label: "Custom" },
];

type PresetGains = {
  self: number;
  sync: number;
  lead: number;
  drums: number;
  guitar: number;
  keys: number;
  other: number;
};

const PRESET_GAINS: Record<Exclude<MonitorPresetId, "custom">, PresetGains> = {
  vocalist: { self: 100, sync: 70, lead: 0, drums: 25, guitar: 30, keys: 25, other: 15 },
  guitarist: { self: 100, sync: 50, lead: 70, drums: 25, guitar: 20, keys: 20, other: 15 },
  drummer: { self: 100, sync: 80, lead: 60, drums: 0, guitar: 30, keys: 20, other: 15 },
  keyboardist: { self: 100, sync: 55, lead: 75, drums: 20, guitar: 25, keys: 0, other: 15 },
  flutist: { self: 100, sync: 60, lead: 80, drums: 20, guitar: 20, keys: 15, other: 15 },
};

function roleHint(member: MonitorRosterMember): "lead" | "drums" | "guitar" | "keys" | "other" {
  const blob = `${member.displayName} ${member.role}`.toLowerCase();
  if (/(drum|perc)/.test(blob)) {
    return "drums";
  }
  if (/(guitar|bass)/.test(blob)) {
    return "guitar";
  }
  if (/(key|piano|synth)/.test(blob)) {
    return "keys";
  }
  if (/(sing|vocal|lead)/.test(blob)) {
    return "lead";
  }
  return "other";
}

export function applyMonitorPreset(
  preset: MonitorPresetId,
  receiverId: string,
  members: MonitorRosterMember[],
): MonitorSources {
  if (preset === "custom") {
    return {};
  }
  const gains = PRESET_GAINS[preset];
  const sources: MonitorSources = {
    [SELF_SOURCE_ID]: { gain: gains.self, muted: false, solo: false },
    [SYNC_SOURCE_ID]: { gain: gains.sync, muted: false, solo: false },
  };
  for (const member of members) {
    if (member.userId === receiverId) {
      continue;
    }
    const hint = roleHint(member);
    const gain =
      hint === "lead"
        ? gains.lead
        : hint === "drums"
          ? gains.drums
          : hint === "guitar"
            ? gains.guitar
            : hint === "keys"
              ? gains.keys
              : gains.other;
    sources[member.userId] = { gain, muted: false, solo: false };
  }
  return sources;
}
