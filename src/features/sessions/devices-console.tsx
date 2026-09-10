"use client";

import { ConnectedMembersPanel } from "@/components/studio/connected-members";
import { LatencyDisclaimer } from "@/components/studio/latency-disclaimer";
import { AudioGate } from "@/components/studio/audio-gate";
import { useMasterSession } from "@/hooks/use-master-session";
import type { MasterSession } from "@/lib/sessions/map-session";

export function DevicesConsole({
  teamId,
  teamName,
  userId,
  initialSession,
}: {
  teamId: string;
  teamName: string;
  userId: string;
  initialSession: MasterSession | null;
}) {
  const master = useMasterSession({
    teamId,
    userId,
    canControl: true,
    initialSession,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-accent">DEVICES</p>
      <h1 className="text-3xl font-semibold tracking-tight">{teamName}</h1>
      <p className="text-sm text-muted">
        Each browser tab has its own device id in session storage so Admin,
        Member 1, Member 2, and Member 3 can be tested side by side.
      </p>
      <AudioGate audio={master.audio} onActivate={() => void master.activateAudio()} />
      <ConnectedMembersPanel devices={master.devices} />
      <LatencyDisclaimer />
    </div>
  );
}
