"use client";

import { useEffect, useState, useRef } from "react";
import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { useSupabaseBrowserClient } from "@/hooks/use-supabase-browser-client";
import { BeatAudioEngine } from "@/lib/audio/engine";
import {
  ClockSynchronizer,
  sessionChannelName,
  presenceChannelName,
  membershipChannelName,
  getOrCreateDeviceId,
  parseUserAgent,
  syncQualityFromRtt,
  DISPLAY_FRAME_MS,
  DEVICE_HEARTBEAT_MS,
} from "@/lib/sync";
import { SessionRevisionGate } from "@/lib/sync/revision-gate";
import { getPlaybackPosition } from "@/lib/sync/playback-position";
import type { PlaybackPosition } from "@/lib/sync/types";
import { deriveAppSessionStatus } from "@/lib/sessions/transitions";
import type { MasterSession } from "@/lib/sessions/map-session";
import {
  controlBeatSession,
  ensureBeatSession,
  fetchBeatSession,
  fetchServerEpochMs,
  type SessionCommand,
  type TypedSupabase,
} from "@/features/sessions/client";
import type { AudioEngineSnapshot } from "@/lib/audio/types";
import type { SyncQuality } from "@/types/session";
import type { ClockSnapshot } from "@/lib/sync/clock";
import { DEFAULT_BPM } from "@/lib/tempo/constants";

type UseMasterSessionOptions = {
  teamId: string;
  userId: string;
  canControl: boolean;
  initialSession: MasterSession | null;
};

export type DevicePresenceRow = {
  deviceId: string;
  userId: string;
  displayName: string;
  connection: "CONNECTED" | "UNSTABLE" | "OFFLINE" | "SYNCING";
  latencyMs: number | null;
  syncStatus: SyncQuality;
  lastSeenAt: string | null;
  deviceLabel: string;
};

export function useMasterSession({
  teamId,
  userId,
  canControl,
  initialSession,
}: UseMasterSessionOptions) {
  const supabase = useSupabaseBrowserClient();
  const engineRef = useRef<BeatAudioEngine | null>(null);
  const clockRef = useRef(new ClockSynchronizer());
  const revisionRef = useRef(new SessionRevisionGate());
  const deviceIdRef = useRef<string>("");
  const [session, setSession] = useState<MasterSession | null>(initialSession);
  const [position, setPosition] = useState<PlaybackPosition>(() =>
    positionFromSession(initialSession, Date.now()),
  );
  const [audio, setAudio] = useState<AudioEngineSnapshot>({
    state: "UNINITIALIZED",
    suspended: false,
    bpm: initialSession?.bpm ?? DEFAULT_BPM,
    timeSignature: initialSession?.timeSignature ?? "4/4",
    pattern: initialSession?.beatPattern ?? [1, 0, 0, 0],
    nextBeatIndex: 0,
    error: null,
  });
  const [clock, setClock] = useState<ClockSnapshot>({
    clockOffsetMs: 0,
    roundTripMs: 0,
    estimatedLatencyMs: 0,
    lastSyncAt: null,
    sampleCount: 0,
  });
  const [nowMs, setNowMs] = useState(0);
  const [devices, setDevices] = useState<DevicePresenceRow[]>([]);
  const [realtimeState, setRealtimeState] = useState<
    "connecting" | "live" | "reconnecting" | "offline"
  >("connecting");
  const [membershipBlocked, setMembershipBlocked] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const commandLockRef = useRef(false);

  const nowFn = () => clockRef.current.getSynchronizedNow();

  useEffect(() => {
    deviceIdRef.current = getOrCreateDeviceId();
    const engine = new BeatAudioEngine({
      clock: { now: () => clockRef.current.getSynchronizedNow() },
    });
    engineRef.current = engine;
    const unsub = engine.subscribe(setAudio);
    return () => {
      unsub();
      void engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncClock() {
      try {
        await clockRef.current.sync({
          fetchServerEpochMs: () => fetchServerEpochMs(supabase),
        });
        if (!cancelled) {
          setClock(clockRef.current.getSnapshot());
        }
      } catch {
        if (!cancelled) {
          setRealtimeState((current) => (current === "live" ? current : "offline"));
        }
      }
    }

    void syncClock();
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          await clockRef.current.sample({
            fetchServerEpochMs: () => fetchServerEpochMs(supabase),
          });
          if (!cancelled) {
            setClock(clockRef.current.getSnapshot());
          }
        } catch {
          if (!cancelled) {
            setRealtimeState((current) => (current === "live" ? current : "offline"));
          }
        }
      })();
    }, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    const gate = revisionRef.current;
    if (initialSession) {
      gate.reset(initialSession.revision);
    }

    function pushToEngine(next: MasterSession, force: boolean) {
      if (engineRef.current && engineRef.current.getSnapshot().state !== "UNINITIALIZED") {
        engineRef.current.applySession(
          {
            status: next.status,
            startAt: next.startAt,
            bpm: next.bpm,
            timeSignature: next.timeSignature,
            pattern: next.beatPattern,
            positionBeats: next.positionBeats,
            revision: next.revision,
          },
          { force },
        );
      }
    }

    async function applyAuthoritative(next: MasterSession | null, force = false) {
      if (cancelled) {
        return;
      }
      if (!next) {
        engineRef.current?.stop();
        setSession(null);
        return;
      }
      if (next.revision < gate.revision) {
        return;
      }
      gate.reset(next.revision);
      setSession(next);
      pushToEngine(next, force);
    }

    async function refresh() {
      try {
        const latest = await fetchBeatSession(supabase, teamId);
        await applyAuthoritative(latest, true);
        if (!cancelled) {
          setRealtimeState("live");
        }
      } catch {
        if (!cancelled) {
          setRealtimeState("offline");
        }
      }
    }

    const sessionChannel: RealtimeChannel = supabase
      .channel(sessionChannelName(teamId))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "beat_sessions",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          void fetchBeatSession(supabase, teamId).then((latest) =>
            applyAuthoritative(latest, false),
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeState("live");
          void refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeState("reconnecting");
          void refresh();
        } else if (status === "CLOSED") {
          setRealtimeState("offline");
        }
      });

    const membershipChannel = supabase
      .channel(membershipChannelName(teamId))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const row = payload.new as { user_id?: string; status?: string } | null;
          if (row?.user_id === userId && row.status !== "approved") {
            setMembershipBlocked(true);
            engineRef.current?.stop();
          }
        },
      )
      .subscribe();

    const onOnline = () => {
      setRealtimeState("reconnecting");
      void refresh();
    };
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      void supabase.removeChannel(sessionChannel);
      void supabase.removeChannel(membershipChannel);
    };
  }, [initialSession, supabase, teamId, userId]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (stamp: number) => {
      if (stamp - last >= DISPLAY_FRAME_MS) {
        last = stamp;
        const syncedNow = nowFn();
        setNowMs(syncedNow);
        setPosition(positionFromSession(session, syncedNow));
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [session]);

  useEffect(() => {
    const presence = supabase.channel(presenceChannelName(teamId), {
      config: { presence: { key: deviceIdRef.current || getOrCreateDeviceId() } },
    });

    const refreshDevices = () => {
      void loadDevices(supabase, teamId, presence.presenceState()).then(setDevices);
    };

    presence
      .on("presence", { event: "sync" }, refreshDevices)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "member_devices",
          filter: `team_id=eq.${teamId}`,
        },
        refreshDevices,
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await trackPresence(presence);
          refreshDevices();
        }
      });

    const heartbeat = window.setInterval(() => {
      void heartbeatDevice(supabase, {
        deviceId: deviceIdRef.current || getOrCreateDeviceId(),
        userId,
        teamId,
        sessionId: session?.id ?? null,
        clock: clockRef.current.getSnapshot(),
      });
      void trackPresence(presence);
      refreshDevices();
    }, DEVICE_HEARTBEAT_MS);

    const onPageHide = () => {
      void supabase
        .from("member_devices")
        .update({ sync_status: "OFFLINE" })
        .eq("id", deviceIdRef.current);
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(heartbeat);
      void supabase.removeChannel(presence);
    };
  }, [session?.id, supabase, teamId, userId]);

  async function activateAudio() {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    const snapshot = await engine.activate();
    setAudio(snapshot);
    if (session && snapshot.state !== "ERROR") {
      engine.applySession(
        {
          status: session.status,
          startAt: session.startAt,
          bpm: session.bpm,
          timeSignature: session.timeSignature,
          pattern: session.beatPattern,
          positionBeats: session.positionBeats,
          revision: session.revision,
        },
        { force: true },
      );
    }
  }

  async function runCommand(
    command: SessionCommand,
    extras: {
      bpm?: number;
      genreId?: string | null;
      timeSignature?: string;
      beatPattern?: string;
    } = {},
  ) {
    if (!canControl) {
      setControlError("Master controls are locked.");
      return;
    }
    if (commandLockRef.current) {
      return;
    }
    commandLockRef.current = true;
    setBusy(true);
    setControlError(null);
    try {
      if (!session) {
        await ensureBeatSession(supabase, teamId);
      }
      const next = await controlBeatSession(supabase, {
        teamId,
        command,
        bpm: extras.bpm,
        genreId: extras.genreId,
        timeSignature: extras.timeSignature,
        beatPattern: extras.beatPattern,
      });
      revisionRef.current.reset(next.revision);
      setSession(next);
      engineRef.current?.applySession({
        status: next.status,
        startAt: next.startAt,
        bpm: next.bpm,
        timeSignature: next.timeSignature,
        pattern: next.beatPattern,
        positionBeats: next.positionBeats,
        revision: next.revision,
      });
    } catch (error) {
      setControlError(error instanceof Error ? error.message : "Command failed.");
    } finally {
      commandLockRef.current = false;
      setBusy(false);
    }
  }

  const appStatus = session
    ? deriveAppSessionStatus({
        status: session.status,
        startAt: session.startAt,
        now: nowMs,
        positionBeats: session.positionBeats,
      })
    : "IDLE";

  const localSync = syncQualityFromRtt(
    clock.roundTripMs,
    clock.lastSyncAt,
    nowMs || clock.lastSyncAt || 0,
  );

  return {
    session,
    position,
    audio,
    clock,
    devices,
    realtimeState,
    membershipBlocked,
    controlError,
    busy,
    appStatus,
    localSync,
    activateAudio,
    runCommand,
  };
}

function positionFromSession(
  session: MasterSession | null,
  now: number,
): PlaybackPosition {
  if (!session) {
    return {
      elapsedMs: 0,
      beatIndex: 0,
      barIndex: 0,
      beatNumber: 1,
      barNumber: 1,
      beatInBar: 1,
      phase: 0,
      isPlaying: false,
      isScheduled: false,
    };
  }

  return getPlaybackPosition({
    startAt: session.startAt,
    now,
    bpm: session.bpm,
    timeSignature: session.timeSignature,
    status: session.status,
    positionBeats: session.positionBeats,
  });
}

async function trackPresence(channel: RealtimeChannel) {
  const agent = parseUserAgent(
    typeof navigator === "undefined" ? "" : navigator.userAgent,
  );
  await channel.track({
    device_id: getOrCreateDeviceId(),
    platform: agent.platform,
    browser: agent.browser,
    at: Date.now(),
  });
}

async function heartbeatDevice(
  supabase: TypedSupabase,
  input: {
    deviceId: string;
    userId: string;
    teamId: string;
    sessionId: string | null;
    clock: ClockSnapshot;
  },
) {
  const agent = parseUserAgent(
    typeof navigator === "undefined" ? "" : navigator.userAgent,
  );
  const quality = syncQualityFromRtt(
    input.clock.roundTripMs,
    Date.now(),
    Date.now(),
  );
  await supabase.from("member_devices").upsert({
    id: input.deviceId,
    user_id: input.userId,
    team_id: input.teamId,
    session_id: input.sessionId,
    platform: agent.platform,
    browser: agent.browser,
    device_label: agent.label,
    user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
    clock_offset_ms: input.clock.clockOffsetMs,
    round_trip_ms: input.clock.roundTripMs,
    estimated_latency_ms: input.clock.estimatedLatencyMs,
    sync_status: quality,
    last_seen_at: new Date().toISOString(),
  });
}

async function loadDevices(
  supabase: TypedSupabase,
  teamId: string,
  presence: RealtimePresenceState,
): Promise<DevicePresenceRow[]> {
  const { data, error } = await supabase
    .from("member_devices")
    .select(
      "id, user_id, last_seen_at, estimated_latency_ms, round_trip_ms, sync_status, device_label, browser, platform, profiles ( display_name )",
    )
    .eq("team_id", teamId)
    .order("last_seen_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const presenceIds = new Set(
    Object.values(presence).flatMap((entries) =>
      entries.map((entry) => {
        const payload = entry as { presence_ref: string; device_id?: string };
        return payload.device_id ?? payload.presence_ref;
      }),
    ),
  );

  const now = Date.now();
  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const lastSeenMs = row.last_seen_at ? Date.parse(row.last_seen_at) : null;
    const present = presenceIds.has(row.id);
    const rtt = Number(row.round_trip_ms ?? 0);
    const quality = present
      ? syncQualityFromRtt(rtt, now, now)
      : syncQualityFromRtt(rtt, lastSeenMs, now);

    let connection: DevicePresenceRow["connection"] = "OFFLINE";
    if (quality === "OFFLINE" && !present) {
      connection = "OFFLINE";
    } else if (quality === "UNSTABLE") {
      connection = "UNSTABLE";
    } else if (present) {
      connection = "CONNECTED";
    } else {
      connection = "SYNCING";
    }

    const displayName =
      profile && typeof profile === "object" && profile !== null && "display_name" in profile
        ? String((profile as { display_name: string | null }).display_name ?? "Member")
        : "Member";

    return {
      deviceId: row.id,
      userId: row.user_id,
      displayName,
      connection,
      latencyMs:
        row.estimated_latency_ms == null ? null : Number(row.estimated_latency_ms),
      syncStatus: quality,
      lastSeenAt: row.last_seen_at,
      deviceLabel:
        row.device_label ?? `${row.browser ?? "Browser"} / ${row.platform ?? "Device"}`,
    };
  });
}
