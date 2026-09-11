export const RECORDING_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

export const MAX_RECORDING_MS = 10 * 60 * 1000;
export const MAX_RECORDING_BYTES = 50 * 1024 * 1024;
export const MIN_RECORDING_BYTES = 256;
export const MIN_RECORDING_MS = 250;
export const VOICE_TAKES_BUCKET = "voice-takes";

export type RecordingMimePicker = (type: string) => boolean;

export function pickRecordingMimeType(
  isSupported: RecordingMimePicker | undefined = defaultIsTypeSupported(),
): string | null {
  if (!isSupported) {
    return null;
  }
  const match = RECORDING_MIME_CANDIDATES.find((type) => {
    try {
      return isSupported(type);
    } catch {
      return false;
    }
  });
  return match ?? "";
}

function defaultIsTypeSupported(): RecordingMimePicker | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  return (type) => MediaRecorder.isTypeSupported(type);
}

export function extensionForMime(mime: string): string {
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base.includes("mp4") || base.includes("m4a") || base.includes("aac")) {
    return "m4a";
  }
  if (base.includes("ogg")) {
    return "ogg";
  }
  if (base.includes("mpeg") || base.includes("mp3")) {
    return "mp3";
  }
  if (base.includes("wav")) {
    return "wav";
  }
  return "webm";
}

export function formatDurationMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function recordingStoragePath(input: {
  teamId: string;
  songId: string;
  userId: string;
  recordingId: string;
  mimeType: string;
}): string {
  return `${input.teamId}/${input.songId}/${input.userId}/${input.recordingId}.${extensionForMime(input.mimeType)}`;
}

export function cloneAudioStream(stream: MediaStream): MediaStream {
  const tracks = stream.getAudioTracks().map((track) => track.clone());
  return new MediaStream(tracks);
}

export type VoiceTakeBlob = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
};

export type VoiceRecorderOptions = {
  onDuration?: (elapsedMs: number) => void;
  onError?: (message: string) => void;
};

export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType = "";
  private startedAt = 0;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private stream: MediaStream | null = null;
  private options: VoiceRecorderOptions;
  private stoppedResolve: ((take: VoiceTakeBlob | null) => void) | null = null;

  constructor(options: VoiceRecorderOptions = {}) {
    this.options = options;
  }

  get supported(): boolean {
    return typeof MediaRecorder !== "undefined";
  }

  async start(source: MediaStream, ownsStream: boolean): Promise<void> {
    if (!this.supported) {
      throw new Error("This browser cannot record audio.");
    }
    this.cleanup(true);
    const audioTracks = source.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error("No microphone or instrument input was found.");
    }

    const stream = cloneAudioStream(source);
    this.stream = stream;
    if (ownsStream) {
      for (const track of source.getAudioTracks()) {
        track.stop();
      }
    }

    const mime = pickRecordingMimeType();
    if (mime == null) {
      this.cleanup(true);
      throw new Error("This browser cannot record audio.");
    }
    this.mimeType = mime;
    this.chunks = [];

    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    this.mimeType = recorder.mimeType || mime || "audio/webm";
    this.recorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    recorder.onerror = () => {
      this.options.onError?.("Recording was interrupted.");
    };
    recorder.onstop = () => {
      this.finishStop();
    };

    this.startedAt = performance.now();
    recorder.start(1000);
    this.tickTimer = setInterval(() => {
      const elapsed = performance.now() - this.startedAt;
      this.options.onDuration?.(elapsed);
      if (elapsed >= MAX_RECORDING_MS) {
        void this.stop();
      }
    }, 250);
  }

  async stop(): Promise<VoiceTakeBlob | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") {
      this.cleanup(true);
      return null;
    }
    return new Promise((resolve) => {
      this.stoppedResolve = resolve;
      try {
        if (recorder.state === "recording") {
          recorder.requestData?.();
        }
        recorder.stop();
      } catch {
        this.finishStop();
      }
    });
  }

  cancel(): void {
    this.stoppedResolve = null;
    try {
      if (this.recorder && this.recorder.state !== "inactive") {
        this.recorder.stop();
      }
    } catch {
      // already stopped
    }
    this.cleanup(true);
  }

  private finishStop(): void {
    this.clearTick();
    const elapsed = performance.now() - this.startedAt;
    const mime = this.mimeType || "audio/webm";
    const blob = new Blob(this.chunks, { type: mime });
    this.cleanup(true);

    const resolve = this.stoppedResolve;
    this.stoppedResolve = null;
    if (!resolve) {
      return;
    }
    if (blob.size < MIN_RECORDING_BYTES || elapsed < MIN_RECORDING_MS) {
      resolve(null);
      return;
    }
    if (blob.size > MAX_RECORDING_BYTES) {
      this.options.onError?.("That recording is too large to save.");
      resolve(null);
      return;
    }
    resolve({
      blob,
      mimeType: mime,
      durationMs: Math.round(elapsed),
    });
  }

  private clearTick(): void {
    if (this.tickTimer != null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private cleanup(stopTracks: boolean): void {
    this.clearTick();
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onerror = null;
      this.recorder.onstop = null;
      this.recorder = null;
    }
    if (stopTracks && this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }
    this.stream = null;
    this.chunks = [];
  }
}
