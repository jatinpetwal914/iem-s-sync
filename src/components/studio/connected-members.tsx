import type { DevicePresenceRow } from "@/hooks/use-master-session";
import { cn } from "@/utils/cn";

type ConnectedMembersPanelProps = {
  devices: DevicePresenceRow[];
};

export function ConnectedMembersPanel({ devices }: ConnectedMembersPanelProps) {
  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b0e16] p-5">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
        CONNECTED MEMBERS
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
              className="grid gap-1 rounded-xl border border-white/6 px-3 py-3 sm:grid-cols-[1.2fr_1fr_0.7fr_0.8fr_1fr]"
            >
              <Cell label="Member" value={device.displayName} />
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
                label="Latency"
                value={
                  device.latencyMs == null ? "—" : `${Math.round(device.latencyMs)}ms`
                }
              />
              <Cell label="Sync" value={syncLabel(device)} />
              <Cell label="Device" value={device.deviceLabel} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function syncLabel(device: DevicePresenceRow): string {
  if (device.connection === "SYNCING") {
    return "SYNCING";
  }
  if (device.syncStatus === "EXCELLENT" || device.syncStatus === "GOOD") {
    return "SYNCED";
  }
  return device.syncStatus;
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
