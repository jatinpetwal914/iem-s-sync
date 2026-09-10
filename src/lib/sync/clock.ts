import { CLOCK_SAMPLE_COUNT, SYNC_THRESHOLDS_MS } from "@/lib/sync/constants";
import type { SyncQuality } from "@/types/session";

export type ClockSample = {
  offsetMs: number;
  roundTripMs: number;
  sampledAt: number;
};

export type ClockSnapshot = {
  clockOffsetMs: number;
  roundTripMs: number;
  estimatedLatencyMs: number;
  lastSyncAt: number | null;
  sampleCount: number;
};

export type ServerTimeClient = {
  fetchServerEpochMs: () => Promise<number>;
};

export class ClockSynchronizer {
  private readonly samples: ClockSample[] = [];
  private readonly maxSamples: number;
  private lastSyncAt: number | null = null;

  constructor(maxSamples = CLOCK_SAMPLE_COUNT) {
    this.maxSamples = Math.max(1, maxSamples);
  }

  getSnapshot(): ClockSnapshot {
    const offsetMs = median(this.samples.map((sample) => sample.offsetMs)) ?? 0;
    const roundTripMs = median(this.samples.map((sample) => sample.roundTripMs)) ?? 0;
    return {
      clockOffsetMs: offsetMs,
      roundTripMs,
      estimatedLatencyMs: roundTripMs / 2,
      lastSyncAt: this.lastSyncAt,
      sampleCount: this.samples.length,
    };
  }

  getSynchronizedNow(clientNow = Date.now()): number {
    return clientNow + (this.getSnapshot().clockOffsetMs);
  }

  async sample(client: ServerTimeClient, clientNow: () => number = Date.now): Promise<ClockSample> {
    const t0 = clientNow();
    const serverEpochMs = await client.fetchServerEpochMs();
    const t1 = clientNow();
    const roundTripMs = Math.max(0, t1 - t0);
    const offsetMs = serverEpochMs + roundTripMs / 2 - t1;
    const sample: ClockSample = {
      offsetMs,
      roundTripMs,
      sampledAt: t1,
    };
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    this.lastSyncAt = t1;
    return sample;
  }

  async sync(
    client: ServerTimeClient,
    count = this.maxSamples,
    clientNow: () => number = Date.now,
  ): Promise<ClockSnapshot> {
    for (let index = 0; index < count; index += 1) {
      await this.sample(client, clientNow);
    }
    return this.getSnapshot();
  }
}

export function syncQualityFromRtt(
  roundTripMs: number,
  lastSeenAt: number | null,
  now: number,
  thresholds = SYNC_THRESHOLDS_MS,
): SyncQuality {
  if (lastSeenAt == null || now - lastSeenAt > thresholds.offlineAfterMs) {
    return "OFFLINE";
  }
  if (roundTripMs <= thresholds.excellentMaxRtt) {
    return "EXCELLENT";
  }
  if (roundTripMs <= thresholds.goodMaxRtt) {
    return "GOOD";
  }
  return "UNSTABLE";
}

export function connectionLabel(quality: SyncQuality): "CONNECTED" | "UNSTABLE" | "OFFLINE" {
  if (quality === "OFFLINE") {
    return "OFFLINE";
  }
  if (quality === "UNSTABLE") {
    return "UNSTABLE";
  }
  return "CONNECTED";
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const evenLow = sorted[mid - 1];
  const middle = sorted[mid];
  if (sorted.length % 2 === 0 && evenLow != null && middle != null) {
    return (evenLow + middle) / 2;
  }
  return middle ?? null;
}
