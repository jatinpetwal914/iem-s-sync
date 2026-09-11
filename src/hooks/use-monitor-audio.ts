"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSupabaseBrowserClient } from "@/hooks/use-supabase-browser-client";
import type { DevicePresenceRow } from "@/hooks/use-master-session";
import {
  fetchMonitorMixes,
  fetchMonitorRoster,
  mapMonitorMixRow,
  saveMonitorMix,
} from "@/features/monitor/client";
import {
  anySourceSolo,
  desiredTopology,
  effectiveSourceGain,
  emptyMixForReceiver,
  isRemoteMemberSourceId,
  mergeSources,
  shouldApplyMixRevision,
} from "@/lib/monitor/mix";
import { loadMonitorOverlay, saveMonitorOverlay } from "@/lib/monitor/overlay";
import type {
  MonitorHealth,
  MonitorMixRecord,
  MonitorRosterMember,
  MonitorSourceState,
  MonitorSources,
} from "@/lib/monitor/types";
import { monitorChannelName } from "@/lib/sync/channels";
import { getOrCreateDeviceId } from "@/lib/sync/device";
import {
  MonitorPeerMesh,
  webrtcSupported,
  type MonitorSignal,
  type MonitorStatusBroadcast,
} from "@/lib/webrtc/monitor-mesh";
import { micErrorMessage } from "@/lib/audio/mic";

const PUBLISH_HOLDER = "monitor-publish";

export type MonitorEngineBridge = {
  acquireCapture: (holder: string) => Promise<MediaStream>;
  releaseCapture: (holder: string) => void;
  attachRemoteStream: (userId: string, stream: MediaStream) => void;
  detachRemoteStream: (userId: string) => void;
  setRemoteMix: (userId: string, linearGain: number) => void;
  clearRemoteStreams: () => void;
};

type UseMonitorAudioOptions = {
  teamId: string;
  userId: string;
  enabled: boolean;
  audioReady: boolean;
  canControl: boolean;
  devices: DevicePresenceRow[];
  engine: MonitorEngineBridge;
};

export function useMonitorAudio({
  teamId,
  userId,
  enabled,
  audioReady,
  canControl,
  devices,
  engine,
}: UseMonitorAudioOptions) {
  const supabase = useSupabaseBrowserClient();
  const engineRef = useRef(engine);
  const [roster, setRoster] = useState<MonitorRosterMember[]>([]);
  const [mixes, setMixes] = useState<MonitorMixRecord[]>([]);
  const [overlay, setOverlay] = useState<MonitorSources>({});
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [micReadyByUser, setMicReadyByUser] = useState<Record<string, boolean>>({});
  const [peerState, setPeerState] = useState<Record<string, RTCPeerConnectionState>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const appliedRevision = useRef<Map<string, number>>(new Map());
  const meshRef = useRef<MonitorPeerMesh | null>(null);
  const sendStatusRef = useRef<((status: MonitorStatusBroadcast) => void) | null>(null);
  const webrtcOk = webrtcSupported();

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  const onlineUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const device of devices) {
      if (device.connection === "CONNECTED" || device.connection === "UNSTABLE") {
        ids.add(device.userId);
      }
    }
    return ids;
  }, [devices]);

  const myMix = useMemo(() => {
    return mixes.find((mix) => mix.receiverId === userId) ?? emptyMixForReceiver(teamId, userId);
  }, [mixes, teamId, userId]);

  const mergedMine = useMemo(
    () => mergeSources(myMix.sources, overlay),
    [myMix.sources, overlay],
  );

  const topology = useMemo(
    () => desiredTopology(userId, mixes, onlineUserIds),
    [userId, mixes, onlineUserIds],
  );

  const applyRemoteGains = useCallback(
    (sources: MonitorSources) => {
      const solo = anySourceSolo(sources);
      for (const [id, state] of Object.entries(sources)) {
        if (!isRemoteMemberSourceId(id) || id === userId) {
          continue;
        }
        engineRef.current.setRemoteMix(id, effectiveSourceGain(state, solo));
      }
    },
    [userId],
  );

  useEffect(() => {
    applyRemoteGains(mergedMine);
  }, [applyRemoteGains, mergedMine]);

  const upsertMix = useCallback((row: MonitorMixRecord) => {
    const applied = appliedRevision.current.get(row.receiverId);
    if (!shouldApplyMixRevision(row.revision, applied)) {
      return;
    }
    appliedRevision.current.set(row.receiverId, row.revision);
    setMixes((current) => {
      const index = current.findIndex((item) => item.receiverId === row.receiverId);
      if (index === -1) {
        return [...current, row];
      }
      const next = [...current];
      next[index] = row;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !audioReady) {
      meshRef.current?.dispose();
      meshRef.current = null;
      engineRef.current.releaseCapture(PUBLISH_HOLDER);
      engineRef.current.clearRemoteStreams();
      sendStatusRef.current = null;
      return;
    }

    if (!webrtcOk) {
      return;
    }

    let cancelled = false;
    const deviceId = getOrCreateDeviceId();

    const channel: RealtimeChannel = supabase.channel(monitorChannelName(teamId), {
      config: { broadcast: { ack: false, self: false } },
    });

    const mesh = new MonitorPeerMesh({
      localUserId: userId,
      localDeviceId: deviceId,
      sendSignal: (signal) => {
        void channel.send({
          type: "broadcast",
          event: "monitor-signal",
          payload: signal,
        });
      },
      onRemoteStream: (remoteUserId, stream) => {
        engineRef.current.attachRemoteStream(remoteUserId, stream);
      },
      onRemoteClose: (remoteUserId) => {
        engineRef.current.detachRemoteStream(remoteUserId);
        setPeerState((current) => {
          const next = { ...current };
          delete next[remoteUserId];
          return next;
        });
      },
      onPeerState: (remoteUserId, state) => {
        setPeerState((current) => ({ ...current, [remoteUserId]: state }));
      },
    });
    meshRef.current = mesh;

    sendStatusRef.current = (status) => {
      void channel.send({
        type: "broadcast",
        event: "monitor-status",
        payload: status,
      });
    };

    channel
      .on("broadcast", { event: "monitor-signal" }, ({ payload }) => {
        void mesh.handleSignal(payload as MonitorSignal);
      })
      .on("broadcast", { event: "monitor-status" }, ({ payload }) => {
        const status = payload as MonitorStatusBroadcast;
        if (!status?.userId || status.userId === userId) {
          return;
        }
        setMicReadyByUser((current) => ({
          ...current,
          [status.userId]: Boolean(status.micReady),
        }));
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monitor_mixes",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { receiver_id?: string } | null;
            if (oldRow?.receiver_id) {
              appliedRevision.current.delete(oldRow.receiver_id);
              setMixes((current) =>
                current.filter((item) => item.receiverId !== oldRow.receiver_id),
              );
            }
            return;
          }
          const row = payload.new as Parameters<typeof mapMonitorMixRow>[0] | null;
          if (row) {
            upsertMix(mapMonitorMixRow(row));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          void fetchMonitorRoster(supabase, teamId).then((members) => {
            if (!cancelled) {
              setRoster(members);
            }
          });
        },
      );

    async function start() {
      try {
        const [members, rows] = await Promise.all([
          fetchMonitorRoster(supabase, teamId),
          fetchMonitorMixes(supabase, teamId),
        ]);
        if (cancelled) {
          return;
        }
        setOverlay(loadMonitorOverlay(teamId, userId));
        setRoster(members);
        for (const row of rows) {
          appliedRevision.current.set(row.receiverId, row.revision);
        }
        setMixes(rows);
        setLive(true);
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setLive(false);
          setError(caught instanceof Error ? caught.message : "Monitor audio failed to start.");
        }
      }
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void start();
      }
    });

    return () => {
      cancelled = true;
      sendStatusRef.current = null;
      mesh.dispose();
      if (meshRef.current === mesh) {
        meshRef.current = null;
      }
      engineRef.current.releaseCapture(PUBLISH_HOLDER);
      engineRef.current.clearRemoteStreams();
      void supabase.removeChannel(channel);
    };
  }, [audioReady, enabled, supabase, teamId, upsertMix, userId, webrtcOk]);

  const sendKey = topology.sendTo.slice().sort().join(",");
  const receiveKey = topology.receiveFrom.slice().sort().join(",");

  useEffect(() => {
    const mesh = meshRef.current;
    if (!enabled || !audioReady || !mesh) {
      return;
    }
    mesh.setTopology(topology);
  }, [audioReady, enabled, receiveKey, sendKey, topology]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!enabled || !audioReady || !mesh) {
      return;
    }
    let cancelled = false;
    const liveMesh = mesh;
    async function syncPublish() {
      if (topology.sendTo.length === 0) {
        engineRef.current.releaseCapture(PUBLISH_HOLDER);
        liveMesh.setLocalStream(null);
        if (!cancelled) {
          setMicReady(false);
        }
        return;
      }
      try {
        const stream = await engineRef.current.acquireCapture(PUBLISH_HOLDER);
        if (cancelled) {
          return;
        }
        liveMesh.setLocalStream(stream);
        setMicReady(true);
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setMicReady(false);
          setError(micErrorMessage(caught, "monitor"));
        }
      }
    }
    void syncPublish();
    return () => {
      cancelled = true;
    };
  }, [audioReady, enabled, sendKey, topology.sendTo.length]);

  const phase = !enabled
    ? "idle"
    : !webrtcOk || error
      ? "error"
      : live
        ? "live"
        : "connecting";
  const displayError =
    !enabled
      ? null
      : !webrtcOk
        ? "This browser cannot route live monitor audio. The click still works."
        : error;

  useEffect(() => {
    if (!enabled || phase === "idle") {
      return;
    }
    sendStatusRef.current?.({
      userId,
      deviceId: getOrCreateDeviceId(),
      micReady,
      health: micReady ? "READY" : topology.sendTo.length > 0 ? "CONNECTING" : "READY",
    });
  }, [enabled, micReady, phase, topology.sendTo.length, userId]);

  const health: MonitorHealth = !enabled
    ? "OFF"
    : phase === "connecting" || (!audioReady && enabled)
      ? "CONNECTING"
      : phase === "error"
        ? "DEGRADED"
        : Object.values(peerState).some((state) => state === "failed")
          ? "DEGRADED"
          : Object.values(peerState).some(
                (state) => state === "disconnected" || state === "connecting",
              )
            ? "CONNECTING"
            : "READY";

  const connectedUserIds = useMemo(() => [...onlineUserIds], [onlineUserIds]);
  const neededSenders = useMemo(() => {
    const ids = new Set<string>();
    for (const mix of mixes) {
      for (const [id, state] of Object.entries(mix.sources)) {
        if (isRemoteMemberSourceId(id) && !state.muted && state.gain > 0) {
          ids.add(id);
        }
      }
    }
    return ids;
  }, [mixes]);

  const readyCount = connectedUserIds.filter((id) => {
    if (!neededSenders.has(id)) {
      return true;
    }
    if (id === userId) {
      return micReady;
    }
    return Boolean(micReadyByUser[id]);
  }).length;

  function patchLocalSource(sourceId: string, patch: Partial<MonitorSourceState>) {
    if (myMix.locked && !canControl) {
      return;
    }
    setOverlay((current) => {
      const currentSource = mergedMine[sourceId] ?? { gain: 0, muted: false, solo: false };
      const next = {
        ...current,
        [sourceId]: { ...currentSource, ...patch },
      };
      saveMonitorOverlay(teamId, userId, next);
      return next;
    });
  }

  async function saveReceiverMix(
    receiverId: string,
    sources: MonitorSources,
    locked: boolean,
  ) {
    if (!canControl) {
      setSaveError("Only an admin can save a master mix.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const row = await saveMonitorMix(supabase, {
        teamId,
        receiverId,
        sources,
        locked,
      });
      upsertMix(row);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not save the mix.");
    } finally {
      setSaving(false);
    }
  }

  return {
    enabled,
    health,
    phase,
    error: displayError,
    saveError,
    saving,
    micReady,
    micActive: enabled && micReady,
    readyCount,
    connectedCount: connectedUserIds.length,
    roster,
    mixes,
    myMix,
    overlay,
    mergedMine,
    topology,
    peerState,
    locked: myMix.locked,
    webrtcOk,
    patchLocalSource,
    saveReceiverMix,
  };
}
