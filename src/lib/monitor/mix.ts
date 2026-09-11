import { clampPercent } from "@/lib/audio/graph";
import { shouldApplyRevision } from "@/lib/sync/revision";
import {
  EMPTY_SOURCE,
  SELF_SOURCE_ID,
  SYNC_SOURCE_ID,
  type MonitorMixRecord,
  type MonitorSourceState,
  type MonitorSources,
} from "@/lib/monitor/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isReservedSourceId(id: string): boolean {
  return id === SELF_SOURCE_ID || id === SYNC_SOURCE_ID;
}

export function isRemoteMemberSourceId(id: string): boolean {
  return UUID_RE.test(id);
}

export function parseSourceState(value: unknown): MonitorSourceState {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_SOURCE };
  }
  const row = value as Partial<MonitorSourceState>;
  return {
    gain: clampPercent(Number(row.gain ?? 0)),
    muted: Boolean(row.muted),
    solo: Boolean(row.solo),
  };
}

export function parseSources(value: unknown): MonitorSources {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: MonitorSources = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isReservedSourceId(key) && !isRemoteMemberSourceId(key)) {
      continue;
    }
    out[key] = parseSourceState(entry);
  }
  return out;
}

export function sourceIsAudible(state: MonitorSourceState | undefined): boolean {
  if (!state || state.muted) {
    return false;
  }
  return state.gain > 0;
}

export function mergeSource(
  admin: MonitorSourceState | undefined,
  overlay: MonitorSourceState | undefined,
): MonitorSourceState {
  return {
    gain: overlay?.gain ?? admin?.gain ?? 0,
    muted: overlay?.muted ?? admin?.muted ?? false,
    solo: overlay?.solo ?? admin?.solo ?? false,
  };
}

export function mergeSources(
  admin: MonitorSources,
  overlay: MonitorSources,
): MonitorSources {
  const keys = new Set([...Object.keys(admin), ...Object.keys(overlay)]);
  const out: MonitorSources = {};
  for (const key of keys) {
    out[key] = mergeSource(admin[key], overlay[key]);
  }
  return out;
}

export function anySourceSolo(sources: MonitorSources): boolean {
  return Object.values(sources).some((source) => source.solo && !source.muted);
}

export function effectiveSourceGain(
  state: MonitorSourceState,
  soloActive: boolean,
): number {
  if (state.muted) {
    return 0;
  }
  if (soloActive && !state.solo) {
    return 0;
  }
  return clampPercent(state.gain) / 100;
}

/** Remote member IDs this receiver actually needs to hear. Never includes self or click. */
export function neededRemoteSourceIds(sources: MonitorSources, receiverId: string): string[] {
  const ids: string[] = [];
  for (const [id, state] of Object.entries(sources)) {
    if (!isRemoteMemberSourceId(id) || id === receiverId) {
      continue;
    }
    if (sourceIsAudible(state)) {
      ids.push(id);
    }
  }
  return ids;
}

export type MonitorTopology = {
  receiveFrom: string[];
  sendTo: string[];
};

/**
 * Selective mesh: only connect to members who must send or receive live audio.
 * Click/self never appear here — those stay local.
 */
export function desiredTopology(
  localUserId: string,
  mixes: Iterable<Pick<MonitorMixRecord, "receiverId" | "sources">>,
  onlineUserIds: Iterable<string>,
): MonitorTopology {
  const online = new Set(onlineUserIds);
  const receiveFrom = new Set<string>();
  const sendTo = new Set<string>();

  for (const mix of mixes) {
    const needed = neededRemoteSourceIds(mix.sources, mix.receiverId);
    if (mix.receiverId === localUserId) {
      for (const id of needed) {
        if (online.has(id) && id !== localUserId) {
          receiveFrom.add(id);
        }
      }
      continue;
    }
    if (!online.has(mix.receiverId) || mix.receiverId === localUserId) {
      continue;
    }
    if (needed.includes(localUserId)) {
      sendTo.add(mix.receiverId);
    }
  }

  return {
    receiveFrom: [...receiveFrom],
    sendTo: [...sendTo],
  };
}

export function shouldApplyMixRevision(
  incoming: number,
  applied: number | undefined,
): boolean {
  if (applied == null) {
    return Number.isFinite(incoming);
  }
  if (incoming === applied) {
    return true;
  }
  return shouldApplyRevision(incoming, applied);
}

export function emptyMixForReceiver(
  teamId: string,
  receiverId: string,
): MonitorMixRecord {
  return {
    id: `local:${receiverId}`,
    teamId,
    receiverId,
    sources: {
      [SELF_SOURCE_ID]: { gain: 100, muted: false, solo: false },
      [SYNC_SOURCE_ID]: { gain: 60, muted: false, solo: false },
    },
    locked: false,
    revision: 0,
    updatedAt: new Date(0).toISOString(),
  };
}
