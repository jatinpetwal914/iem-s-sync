type WordmarkProps = {
  compact?: boolean;
};

export function Wordmark({ compact = false }: WordmarkProps) {
  return (
    <div className="flex items-baseline gap-2 tracking-[0.22em]">
      <span className="text-[11px] font-semibold text-accent">IEM</span>
      <span
        className={`font-semibold text-foreground ${compact ? "text-sm" : "text-lg sm:text-xl"}`}
      >
        SYNC
      </span>
    </div>
  );
}
