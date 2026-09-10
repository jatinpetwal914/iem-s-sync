import { Button } from "@/components/ui/button";
import { canTransition } from "@/lib/sessions/transitions";
import type { SessionTransportStatus } from "@/lib/sync/types";

type TransportBarProps = {
  status: SessionTransportStatus;
  busy: boolean;
  disabled?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function TransportBar({
  status,
  busy,
  disabled = false,
  onPlay,
  onPause,
  onResume,
  onStop,
  onReset,
}: TransportBarProps) {
  const lock = busy || disabled;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Button
        variant="beat"
        disabled={lock || !canTransition(status, "play")}
        onClick={onPlay}
      >
        PLAY
      </Button>
      <Button
        variant="ghost"
        disabled={lock || !canTransition(status, "pause")}
        onClick={onPause}
      >
        PAUSE
      </Button>
      <Button
        variant="accent"
        disabled={lock || !canTransition(status, "resume")}
        onClick={onResume}
      >
        RESUME
      </Button>
      <Button
        variant="danger"
        disabled={lock || !canTransition(status, "stop")}
        onClick={onStop}
      >
        STOP
      </Button>
      <Button variant="ghost" disabled={lock} onClick={onReset} className="col-span-2 sm:col-span-1">
        RESET
      </Button>
    </div>
  );
}
