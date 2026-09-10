const LINES = [
  {
    title: "One clock",
    copy: "The owner starts the session. Everyone else locks to the same startAt.",
  },
  {
    title: "Same phase",
    copy: "Late joiners do not restart at beat one. They drop in on the current bar.",
  },
  {
    title: "Local click",
    copy: "The network carries timing. Each device generates its own sound.",
  },
] as const;

export function LandingLines() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {LINES.map((line, index) => (
        <li
          key={line.title}
          className="hero-copy rounded-[1.75rem] border border-white/10 bg-surface/85 px-5 py-6"
          style={{ animationDelay: `${0.12 * (index + 1)}s` }}
        >
          <p className="font-mono text-[10px] tracking-[0.24em] text-accent">
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-3 text-xl font-semibold tracking-tight">{line.title}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{line.copy}</p>
        </li>
      ))}
    </ul>
  );
}
