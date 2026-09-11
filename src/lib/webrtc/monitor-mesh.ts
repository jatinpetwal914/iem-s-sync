/**
 * Optional monitor-audio WebRTC layer.
 *
 * Audit: this repository had no RTCPeerConnection, signaling, or media
 * sockets. Transport for the click is Supabase Realtime control data plus
 * local Web Audio. This module is the first WebRTC stack and must stay
 * gated behind Monitor Audio = ON.
 *
 * Topology: selective peer-to-peer mesh. One RTCPeerConnection per remote
 * user who must send or receive live mic audio. Not an SFU. Mesh cost is
 * O(n²) in the worst case; keep n small (a band). STUN only — symmetric
 * NATs may fail without a TURN server, which this repo does not provide.
 *
 * Signaling is SDP/ICE only, via Supabase Realtime broadcast. Never send
 * PCM, Opus, or other media through Realtime or Postgres.
 *
 * The synchronized click must never travel through these peer connections.
 */

export const MONITOR_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

export type MonitorSignalKind = "offer" | "answer" | "ice";

export type MonitorSignal = {
  fromUserId: string;
  toUserId: string;
  fromDeviceId: string;
  kind: MonitorSignalKind;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
};

export type MonitorStatusBroadcast = {
  userId: string;
  deviceId: string;
  micReady: boolean;
  health: "CONNECTING" | "READY" | "DEGRADED" | "OFFLINE";
};

export type MonitorTopology = {
  receiveFrom: string[];
  sendTo: string[];
};

export function webrtcSupported(): boolean {
  return typeof RTCPeerConnection === "function";
}

type PeerSlot = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  sender: RTCRtpSender | null;
};

export type MonitorPeerMeshOptions = {
  localUserId: string;
  localDeviceId: string;
  sendSignal: (signal: MonitorSignal) => void;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onRemoteClose: (userId: string) => void;
  onPeerState: (userId: string, state: RTCPeerConnectionState) => void;
};

export class MonitorPeerMesh {
  private readonly peers = new Map<string, PeerSlot>();
  private localStream: MediaStream | null = null;
  private sendTo = new Set<string>();
  private closed = false;

  constructor(private readonly options: MonitorPeerMeshOptions) {}

  setLocalStream(stream: MediaStream | null): void {
    this.localStream = stream;
    for (const [userId, slot] of this.peers) {
      void this.syncSender(userId, slot);
    }
  }

  setTopology(topology: MonitorTopology): void {
    if (this.closed) {
      return;
    }
    this.sendTo = new Set(topology.sendTo);
    const desired = new Set([...topology.receiveFrom, ...topology.sendTo]);
    for (const userId of this.peers.keys()) {
      if (!desired.has(userId)) {
        this.closePeer(userId);
      }
    }
    for (const userId of desired) {
      if (userId === this.options.localUserId) {
        continue;
      }
      const slot = this.ensurePeer(userId);
      void this.syncSender(userId, slot);
    }
  }

  async handleSignal(signal: MonitorSignal): Promise<void> {
    if (this.closed) {
      return;
    }
    if (signal.toUserId !== this.options.localUserId) {
      return;
    }
    if (signal.fromUserId === this.options.localUserId) {
      return;
    }
    const slot = this.ensurePeer(signal.fromUserId);
    const pc = slot.pc;
    const polite = this.options.localUserId > signal.fromUserId;

    try {
      if (signal.kind === "ice") {
        const candidate = signal.payload as RTCIceCandidateInit;
        if (!candidate.candidate && candidate.sdpMid == null && candidate.sdpMLineIndex == null) {
          return;
        }
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          if (!slot.ignoreOffer) {
            throw new Error("ICE candidate rejected");
          }
        }
        return;
      }

      const description = signal.payload as RTCSessionDescriptionInit;
      const offerCollision =
        description.type === "offer" &&
        (slot.makingOffer || pc.signalingState !== "stable");
      slot.ignoreOffer = !polite && offerCollision;
      if (slot.ignoreOffer) {
        return;
      }
      await pc.setRemoteDescription(description);
      if (description.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) {
          this.options.sendSignal({
            fromUserId: this.options.localUserId,
            toUserId: signal.fromUserId,
            fromDeviceId: this.options.localDeviceId,
            kind: "answer",
            payload: {
              type: pc.localDescription.type,
              sdp: pc.localDescription.sdp,
            },
          });
        }
      }
    } catch {
      this.options.onPeerState(signal.fromUserId, pc.connectionState);
    }
  }

  dispose(): void {
    this.closed = true;
    for (const userId of [...this.peers.keys()]) {
      this.closePeer(userId);
    }
    this.localStream = null;
    this.sendTo.clear();
  }

  private ensurePeer(userId: string): PeerSlot {
    const existing = this.peers.get(userId);
    if (existing) {
      return existing;
    }
    const pc = new RTCPeerConnection({ iceServers: MONITOR_ICE_SERVERS });
    const slot: PeerSlot = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      sender: null,
    };
    this.peers.set(userId, slot);

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }
      this.options.sendSignal({
        fromUserId: this.options.localUserId,
        toUserId: userId,
        fromDeviceId: this.options.localDeviceId,
        kind: "ice",
        payload: {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        },
      });
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream(event.track ? [event.track] : []);
      this.options.onRemoteStream(userId, stream);
    };

    pc.onconnectionstatechange = () => {
      this.options.onPeerState(userId, pc.connectionState);
      if (pc.connectionState === "failed") {
        try {
          pc.restartIce();
        } catch {
          // ignore
        }
      }
      if (pc.connectionState === "closed" || pc.connectionState === "disconnected") {
        if (pc.connectionState === "closed") {
          this.options.onRemoteClose(userId);
        }
      }
    };

    pc.onnegotiationneeded = () => {
      void this.negotiate(userId, slot);
    };

    return slot;
  }

  private async negotiate(userId: string, slot: PeerSlot): Promise<void> {
    if (this.closed) {
      return;
    }
    try {
      slot.makingOffer = true;
      const offer = await slot.pc.createOffer();
      await slot.pc.setLocalDescription(offer);
      if (slot.pc.localDescription) {
        this.options.sendSignal({
          fromUserId: this.options.localUserId,
          toUserId: userId,
          fromDeviceId: this.options.localDeviceId,
          kind: "offer",
          payload: {
            type: slot.pc.localDescription.type,
            sdp: slot.pc.localDescription.sdp,
          },
        });
      }
    } catch {
      this.options.onPeerState(userId, slot.pc.connectionState);
    } finally {
      slot.makingOffer = false;
    }
  }

  private async syncSender(userId: string, slot: PeerSlot): Promise<void> {
    const shouldSend = this.sendTo.has(userId);
    const track = this.localStream?.getAudioTracks()[0] ?? null;
    try {
      if (shouldSend && track) {
        if (slot.sender) {
          await slot.sender.replaceTrack(track);
        } else {
          slot.sender = slot.pc.addTrack(track, this.localStream as MediaStream);
        }
      } else if (slot.sender) {
        await slot.sender.replaceTrack(null);
      }
    } catch {
      // replaceTrack can fail during teardown
    }
  }

  private closePeer(userId: string): void {
    const slot = this.peers.get(userId);
    if (!slot) {
      return;
    }
    this.peers.delete(userId);
    try {
      slot.pc.ontrack = null;
      slot.pc.onicecandidate = null;
      slot.pc.onnegotiationneeded = null;
      slot.pc.onconnectionstatechange = null;
      slot.pc.close();
    } catch {
      // already closed
    }
    this.options.onRemoteClose(userId);
  }
}
