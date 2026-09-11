import { parseSources } from "@/lib/monitor/mix";
import type { MonitorSources } from "@/lib/monitor/types";

const PREFIX = "iem-monitor-local:";

export function monitorOverlayKey(teamId: string, userId: string): string {
  return `${PREFIX}${teamId}:${userId}`;
}

export function loadMonitorOverlay(teamId: string, userId: string): MonitorSources {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(monitorOverlayKey(teamId, userId));
    if (!raw) {
      return {};
    }
    return parseSources(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveMonitorOverlay(
  teamId: string,
  userId: string,
  overlay: MonitorSources,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(monitorOverlayKey(teamId, userId), JSON.stringify(overlay));
  } catch {
    // Quota or private mode — overlay still works in memory.
  }
}
