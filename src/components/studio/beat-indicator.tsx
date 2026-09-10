import type { PlaybackPosition } from "@/lib/sync/types";
import { cn } from "@/utils/cn";

type BeatIndicatorProps = {
  position: PlaybackPosition;
  beatsPerBar: number;
  size?: "lg" | "xl";
};

export function BeatIndicator({
  position,
  beatsPerBar,
  size = "xl",
}: BeatIndicatorProps) {
  const active = position.isPlaying && !position.isScheduled;
  const scale = active ? 1.14 - position.phase * 0.14 : 1;
  const accent = position.beatInBar === 1;

  return (
    <div
      className="flex flex-col items-center gap-6"
      aria-live="polite"
      aria-label={`Bar ${position.barNumber}, beat ${position.beatInBar}`}
    >
      <div
        className={cn(
          "relative grid place-items-center rounded-full border",
          size === "xl" ? "h-40 w-40 sm:h-56 sm:w-56" : "h-32 w-32",
          accent && active ? "border-accent" : "border-white/12",
        )}
        style={{
          transform: `scale(${scale})`,
          boxShadow: active
            ? accent
              ? "0 0 48px color-mix(in srgb, var(--accent) 45%, transparent)"
              : "0 0 36px color-mix(in srgb, var(--beat) 40%, transparent)"
            : "none",
          transition: "box-shadow 80ms linear",
        }}
      >
        <div
          className={cn(
            "absolute inset-4 rounded-full",
            accent && active ? "bg-accent/20" : "bg-beat/15",
          )}
        />
        <div className="relative text-center">
          <p className="font-mono text-[10px] tracking-[0.28em] text-muted">BEAT</p>
          <p className="mt-1 font-mono text-5xl font-semibold tabular-nums text-foreground sm:text-6xl">
            {position.beatInBar}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: beatsPerBar }, (_, index) => {
          const beat = index + 1;
          const on = position.beatInBar === beat && active;
          return (
            <span
              key={beat}
              className={cn(
                "h-2.5 w-5 rounded-full sm:w-8",
                on ? (beat === 1 ? "bg-accent" : "bg-beat") : "bg-white/12",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
