const SIGNAL_PATH = [
  "Admin",
  "Master state",
  "startAt",
  "Realtime",
  "Local Web Audio",
] as const;

export function SignalPath() {
  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-5">
      {SIGNAL_PATH.map((step, index) => (
        <li
          key={step}
          className="rounded-2xl border border-white/10 bg-background/50 px-4 py-4"
        >
          <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">{step}</p>
        </li>
      ))}
    </ol>
  );
}
