import type { DevicePresenceRow } from "@/hooks/use-master-session";
import { cn } from "@/utils/cn";

type ConnectedMembersPanelProps = {
  devices: DevicePresenceRow[];
};

export function ConnectedMembersPanel({ devices }: ConnectedMembersPanelProps) {
  return (
    <section className="rounded-2xl border border-white/8 bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
        CONNECTION HEALTH
      </p>
      {devices.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No devices are reporting yet. Open PlayBox on a member phone to appear
          here.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {devices.map((device) => (
            <li
              key={device.deviceId}
              className="grid gap-2 rounded-xl border border-white/6 px-3 py-3 sm:grid-cols-[1.3fr_0.7fr_1fr_0.9fr_0.9fr_1fr]"
            >
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
                  MEMBER
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {statusDot(device)} {device.displayName}
                </p>
                <p className="font-mono text-[10px] text-muted">{device.role}</p>
              </div>
              <Cell
                label="Connection"
                value={device.connection}
                tone={
                  device.connection === "CONNECTED"
                    ? "ok"
                    : device.connection === "OFFLINE"
                      ? "bad"
                      : "warn"
                }
              />
              <Cell
                label="Network latency"
                value={
                  device.pingMs == null
                    ? "—"
                    : `${Math.round(device.pingMs)} ms${
                        device.pingQuality ? ` · ${device.pingQuality}` : ""
                      }`
                }
                tone={
                  device.pingQuality === "Good"
                    ? "ok"
                    : device.pingQuality === "Fair"
                      ? "warn"
                      : device.pingQuality === "Poor"
                        ? "bad"
                        : "plain"
                }
              />
              <Cell label="Battery" value={batteryLabel(device)} />
              <Cell label="Last seen" value={lastSeenLabel(device.lastSeenAt)} />
              <Cell label="Device" value={device.deviceLabel} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">
        Network latency is connection ping, not headphone or audio latency.
      </p>
    </section>
  );
}

function statusDot(device: DevicePresenceRow): string {
  if (device.connection === "CONNECTED") {
    return "🟢";
  }
  if (device.connection === "OFFLINE") {
    return "🔴";
  }
  return "🟡";
}

function batteryLabel(device: DevicePresenceRow): string {
  if (device.batteryPercent == null) {
    return "Unavailable";
  }
  return `${device.batteryPercent}%${device.batteryCharging ? " charging" : ""}`;
}

function lastSeenLabel(value: string | null): string {
  if (!value) {
    return "—";
  }
  const elapsed = Date.now() - Date.parse(value);
  if (!Number.isFinite(elapsed) || elapsed < 8_000) {
    return "now";
  }
  if (elapsed < 60_000) {
    return `${Math.round(elapsed / 1000)}s ago`;
  }
  return `${Math.round(elapsed / 60_000)}m ago`;
}

function Cell({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string;
  tone?: "plain" | "ok" | "warn" | "bad";
}) {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-[0.2em] text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          tone === "ok" && "text-sync",
          tone === "warn" && "text-accent",
          tone === "bad" && "text-beat",
        )}
      >
        {value}
      </p>
    </div>
  );
}
