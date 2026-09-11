import { cn } from "@/utils/cn";
import type { PlaybackPosition } from "@/lib/sync/types";
import type { CountInView } from "@/lib/sync/count-in";

type BeatIndicatorProps = {
  position: PlaybackPosition;
  beatsPerBar: number;
  size?: "lg" | "xl";
  countIn?: CountInView | null;
};

export function BeatIndicator({
  position,
  beatsPerBar,
  size = "xl",
  countIn = null,
}: BeatIndicatorProps) {
  const active = position.isPlaying && !position.isScheduled;
  const scale = active ? 1.14 - position.phase * 0.14 : 1;
  const accent = position.beatInBar === 1;
  const counting = Boolean(countIn?.active && countIn.display);

  return (
    <div
      className="flex flex-col items-center gap-6"
      aria-live="polite"
      aria-label={
        counting
          ? `Count-in ${countIn?.display}`
          : `Bar ${position.barNumber}, beat ${position.beatInBar}`
      }
    >
      {counting ? (
        <div className="text-center">
          <p className="font-mono text-[10px] tracking-[0.28em] text-accent">
            COUNT-IN
          </p>
          <p className="mt-1 font-mono text-6xl font-semibold tabular-nums text-accent sm:text-7xl">
            {countIn?.display}
          </p>
        </div>
      ) : null}
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
      <div className="flex gap-3" aria-hidden="true">
        {Array.from({ length: beatsPerBar }, (_, index) => {
          const beat = index + 1;
          const on = position.beatInBar === beat && active;
          return (
            <span
              key={beat}
              className={cn(
                "font-mono text-lg leading-none",
                on ? (beat === 1 ? "text-accent" : "text-beat") : "text-white/25",
              )}
            >
              {on ? "●" : "○"}
            </span>
          );
        })}
      </div>
    </div>
  );
}
