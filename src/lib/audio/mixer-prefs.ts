import {
  DEFAULT_MIXER,
  clampDb,
  clampPercent,
  type ChannelEq,
  type MixerSnapshot,
} from "@/lib/audio/graph";

const PREFIX = "iem-mixer:";

type StoredMixer = {
  master: number;
  sync: number;
  monitor: number;
  backing: number;
  monitorMute: boolean;
  monitorSolo: boolean;
  eq: MixerSnapshot["eq"];
};

export function mixerStorageKey(teamId: string): string {
  return `${PREFIX}${teamId}`;
}

export function loadMixerPrefs(teamId: string): StoredMixer {
  if (typeof window === "undefined") {
    return { ...DEFAULT_MIXER, eq: cloneEq(DEFAULT_MIXER.eq) };
  }
  try {
    const raw = window.localStorage.getItem(mixerStorageKey(teamId));
    if (!raw) {
      return { ...DEFAULT_MIXER, eq: cloneEq(DEFAULT_MIXER.eq) };
    }
    const parsed = JSON.parse(raw) as Partial<StoredMixer>;
    return {
      master: clampPercent(parsed.master ?? DEFAULT_MIXER.master),
      sync: clampPercent(parsed.sync ?? DEFAULT_MIXER.sync),
      monitor: clampPercent(parsed.monitor ?? DEFAULT_MIXER.monitor),
      backing: clampPercent(parsed.backing ?? DEFAULT_MIXER.backing),
      monitorMute: Boolean(parsed.monitorMute),
      monitorSolo: Boolean(parsed.monitorSolo),
      eq: {
        sync: sanitizeEq(parsed.eq?.sync),
        monitor: sanitizeEq(parsed.eq?.monitor),
        backing: sanitizeEq(parsed.eq?.backing),
      },
    };
  } catch {
    return { ...DEFAULT_MIXER, eq: cloneEq(DEFAULT_MIXER.eq) };
  }
}

export function saveMixerPrefs(teamId: string, mixer: StoredMixer): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(mixerStorageKey(teamId), JSON.stringify(mixer));
  } catch {
    // Quota or private mode — local mix still works in memory.
  }
}

function sanitizeEq(eq: ChannelEq | undefined): ChannelEq {
  return {
    low: clampDb(eq?.low ?? 0),
    mid: clampDb(eq?.mid ?? 0),
    high: clampDb(eq?.high ?? 0),
  };
}

function cloneEq(eq: MixerSnapshot["eq"]): MixerSnapshot["eq"] {
  return {
    sync: { ...eq.sync },
    monitor: { ...eq.monitor },
    backing: { ...eq.backing },
  };
}
