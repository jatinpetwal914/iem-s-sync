import { cn } from "@/utils/cn";

type BeatPulseProps = {
  className?: string;
  compact?: boolean;
};

export function BeatPulse({ className, compact = false }: BeatPulseProps) {
  return (
    <div
      className={cn(
        "relative mx-auto grid place-items-center",
        compact ? "h-28 w-28" : "h-44 w-44 sm:h-52 sm:w-52",
        className,
      )}
      aria-hidden="true"
    >
      <span className="beat-ring beat-ring-a" />
      <span className="beat-ring beat-ring-b" />
      <span className="beat-ring beat-ring-c" />
      <div className="relative z-10 flex h-16 w-16 items-end justify-center gap-1 rounded-full bg-surface/80 pb-3 shadow-[0_0_40px_rgba(255,77,141,0.35)] sm:h-20 sm:w-20 sm:pb-4">
        <span className="eq-bar eq-bar-1" />
        <span className="eq-bar eq-bar-2" />
        <span className="eq-bar eq-bar-3" />
        <span className="eq-bar eq-bar-4" />
        <span className="eq-bar eq-bar-5" />
      </div>
    </div>
  );
}
