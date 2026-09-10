import { genres } from "@/config/genres";

export function GenreRail() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {genres.map((genre) => (
        <li
          key={genre.id}
          className="rounded-2xl border border-white/10 bg-background/50 px-4 py-4"
        >
          <p className="text-sm font-medium text-foreground">{genre.name}</p>
          <p className="mt-1 font-mono text-xs text-accent">
            {genre.bpmMin}–{genre.bpmMax}
            {genre.allowsAboveMax ? "+" : ""} BPM
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">{genre.description}</p>
        </li>
      ))}
    </ul>
  );
}
