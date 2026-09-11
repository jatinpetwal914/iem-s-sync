export type BatteryReading = {
  percent: number | null;
  charging: boolean | null;
};

type BatteryManagerLike = {
  level: number;
  charging: boolean;
};

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManagerLike>;
};

export async function readBatteryStatus(): Promise<BatteryReading> {
  if (typeof navigator === "undefined") {
    return { percent: null, charging: null };
  }

  const nav = navigator as NavigatorWithBattery;
  if (typeof nav.getBattery !== "function") {
    return { percent: null, charging: null };
  }

  try {
    const battery = await nav.getBattery();
    const level = Number(battery.level);
    if (!Number.isFinite(level)) {
      return { percent: null, charging: Boolean(battery.charging) };
    }
    return {
      percent: Math.min(100, Math.max(0, Math.round(level * 100))),
      charging: Boolean(battery.charging),
    };
  } catch {
    return { percent: null, charging: null };
  }
}

export type NetworkPingQuality = "Good" | "Fair" | "Poor";

export function networkPingQuality(rttMs: number | null): NetworkPingQuality | null {
  if (rttMs == null || !Number.isFinite(rttMs)) {
    return null;
  }
  if (rttMs <= 80) {
    return "Good";
  }
  if (rttMs <= 160) {
    return "Fair";
  }
  return "Poor";
}
