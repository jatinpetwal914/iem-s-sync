type LoadingStateProps = {
  label?: string;
};

export function LoadingState({
  label = "Loading IEM Sync",
}: LoadingStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-16">
      <div
        aria-hidden
        className="h-12 w-12 rounded-full border border-white/10 border-t-accent animate-spin"
      />
      <p className="font-mono text-[11px] tracking-[0.28em] text-muted">
        {label}
      </p>
    </div>
  );
}
