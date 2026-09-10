import { Button } from "@/components/ui/button";
import type { AudioEngineSnapshot } from "@/lib/audio/types";

type AudioGateProps = {
  audio: AudioEngineSnapshot;
  onActivate: () => void;
};

export function AudioGate({ audio, onActivate }: AudioGateProps) {
  if (audio.state === "UNINITIALIZED") {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/8 p-5">
        <p className="font-mono text-[11px] tracking-[0.24em] text-accent">
          READY TO CONNECT
        </p>
        <p className="mt-2 text-sm text-muted">
          Mobile browsers require a tap before the click can sound. Activation
          unlocks the local audio engine only.
        </p>
        <div className="mt-4">
          <Button variant="accent" onClick={onActivate} aria-label="Activate PlayBox audio">
            ACTIVATE PLAYBOX
          </Button>
        </div>
      </div>
    );
  }

  if (audio.suspended) {
    return (
      <div className="rounded-2xl border border-beat/40 bg-beat/10 p-5">
        <p className="font-mono text-[11px] tracking-[0.24em] text-beat">
          AUDIO ENGINE SUSPENDED
        </p>
        <p className="mt-2 text-sm text-muted">
          The browser paused audio. Resume it with a tap. We will not try to
          bypass autoplay rules.
        </p>
        <div className="mt-4">
          <Button variant="beat" onClick={onActivate} aria-label="Resume PlayBox audio">
            RESUME AUDIO
          </Button>
        </div>
      </div>
    );
  }

  if (audio.state === "ERROR") {
    return (
      <div className="rounded-2xl border border-beat/40 p-5">
        <p className="font-mono text-[11px] tracking-[0.24em] text-beat">
          AUDIO ENGINE ERROR
        </p>
        <p className="mt-2 text-sm text-muted">{audio.error ?? "Audio failed."}</p>
        <div className="mt-4">
          <Button variant="ghost" onClick={onActivate}>
            RETRY
          </Button>
        </div>
      </div>
    );
  }

  return (
    <p className="font-mono text-[11px] tracking-[0.22em] text-sync">
      AUDIO ENGINE READY ✓
    </p>
  );
}
