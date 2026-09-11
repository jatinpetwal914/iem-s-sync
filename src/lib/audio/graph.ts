export const EQ_MIN_DB = -12;
export const EQ_MAX_DB = 12;
export const GAIN_RAMP_SEC = 0.02;

export type MixerChannelId = "master" | "sync" | "monitor" | "backing";
export type EqChannelId = "sync" | "monitor" | "backing";
export type EqBand = "low" | "mid" | "high";

export type ChannelEq = {
  low: number;
  mid: number;
  high: number;
};

export type MixerSnapshot = {
  master: number;
  sync: number;
  monitor: number;
  backing: number;
  monitorMute: boolean;
  monitorSolo: boolean;
  monitorEnabled: boolean;
  monitorError: string | null;
  eq: Record<EqChannelId, ChannelEq>;
};

export const DEFAULT_MIXER: Omit<MixerSnapshot, "monitorEnabled" | "monitorError"> = {
  master: 85,
  sync: 100,
  monitor: 80,
  backing: 0,
  monitorMute: false,
  monitorSolo: false,
  eq: {
    sync: { low: 0, mid: 0, high: 0 },
    monitor: { low: 0, mid: 0, high: 0 },
    backing: { low: 0, mid: 0, high: 0 },
  },
};

export type EqChain = {
  gain: GainNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
};

type AudioClock = Pick<AudioContext, "currentTime">;

type GainLike = {
  gain: Pick<
    AudioParam,
    "value" | "cancelScheduledValues" | "setValueAtTime" | "linearRampToValueAtTime"
  >;
};

type BiquadFactory = Pick<AudioContext, "createGain" | "createBiquadFilter">;

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function percentToGain(percent: number): number {
  return clampPercent(percent) / 100;
}

export function clampDb(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(EQ_MAX_DB, Math.max(EQ_MIN_DB, value));
}

export function rampGain(
  node: GainLike,
  value: number,
  clock: AudioClock,
  seconds = GAIN_RAMP_SEC,
): void {
  const now = clock.currentTime;
  const target = Math.max(0, value);
  const param = node.gain;
  try {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + Math.max(0.008, seconds));
  } catch {
    param.value = target;
  }
}

export function createEqChain(context: BiquadFactory): EqChain {
  const gain = context.createGain();
  const low = context.createBiquadFilter();
  const mid = context.createBiquadFilter();
  const high = context.createBiquadFilter();

  low.type = "lowshelf";
  low.frequency.value = 250;
  low.gain.value = 0;

  mid.type = "peaking";
  mid.frequency.value = 1000;
  mid.Q.value = 1;
  mid.gain.value = 0;

  high.type = "highshelf";
  high.frequency.value = 4000;
  high.gain.value = 0;

  gain.connect(low);
  low.connect(mid);
  mid.connect(high);

  return { gain, low, mid, high };
}

export function applyEq(chain: EqChain, eq: ChannelEq): void {
  chain.low.gain.value = clampDb(eq.low);
  chain.mid.gain.value = clampDb(eq.mid);
  chain.high.gain.value = clampDb(eq.high);
}

export function effectiveChannelGain(
  percent: number,
  muted: boolean,
  silencedBySolo: boolean,
): number {
  if (muted || silencedBySolo) {
    return 0;
  }
  return percentToGain(percent);
}
