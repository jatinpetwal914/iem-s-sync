"use client";

import type { LyricsSettings } from "@/lib/lyrics/types";
import { transitionMs } from "@/lib/lyrics/types";
import type { LyricTimelineView } from "@/lib/lyrics/timing";

type LyricsDisplayProps = {
  chords: string | null;
  fallbackLyrics: string | null;
  view: LyricTimelineView;
  settings: LyricsSettings;
};

export function LyricsDisplay({
  chords,
  fallbackLyrics,
  view,
  settings,
}: LyricsDisplayProps) {
  const duration = transitionMs(settings);

  return (
    <>
      <p className="mt-6 whitespace-pre-wrap font-mono text-2xl leading-snug text-accent sm:text-3xl">
        {chords?.trim() || "—"}
      </p>
      <div
        className="mt-4"
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: `${duration}ms`,
        }}
      >
        {view.lines.length === 0 ? (
          <p className="whitespace-pre-wrap text-2xl leading-relaxed text-foreground sm:text-3xl">
            {fallbackLyrics?.trim() || "No lyrics for this section."}
          </p>
        ) : settings.effect === "static" ? (
          <StaticLyrics view={view} />
        ) : settings.effect === "line" ? (
          <LineLyrics view={view} />
        ) : settings.effect === "karaoke" ? (
          <KaraokeLyrics view={view} highlight={settings.highlight} />
        ) : (
          <ProgressiveLyrics view={view} />
        )}
      </div>
      {!view.timed && settings.effect === "karaoke" ? (
        <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-muted">
          Karaoke is estimated from section length until line times are added.
        </p>
      ) : null}
    </>
  );
}

function StaticLyrics({ view }: { view: LyricTimelineView }) {
  return (
    <div className="flex flex-col gap-2 text-2xl leading-relaxed sm:text-3xl">
      {view.lines.map((line, index) => (
        <p key={`${index}-${line.text}`}>{line.text}</p>
      ))}
    </div>
  );
}

function LineLyrics({ view }: { view: LyricTimelineView }) {
  const current = view.lines.find((line) => line.state === "current");
  return (
    <p className="text-3xl font-semibold leading-relaxed sm:text-4xl">
      {current?.text ?? view.currentLineText}
    </p>
  );
}

function ProgressiveLyrics({ view }: { view: LyricTimelineView }) {
  return (
    <div className="flex flex-col gap-2">
      {view.lines.map((line, index) => {
        if (line.state === "hidden") {
          return null;
        }
        if (line.state === "past") {
          return (
            <p key={`${index}-${line.text}`} className="text-lg text-white/35 sm:text-xl">
              {line.text}
            </p>
          );
        }
        if (line.state === "upcoming") {
          return (
            <p key={`${index}-${line.text}`} className="text-xl text-white/50 sm:text-2xl">
              {line.text}
            </p>
          );
        }
        return (
          <p
            key={`${index}-${line.text}`}
            className="text-3xl font-semibold leading-relaxed text-foreground sm:text-4xl"
          >
            {line.text}
          </p>
        );
      })}
    </div>
  );
}

function KaraokeLyrics({
  view,
  highlight,
}: {
  view: LyricTimelineView;
  highlight: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {view.lines.map((line, index) => {
        if (line.state === "hidden") {
          return null;
        }
        const muted =
          line.state === "past" ? "text-white/40" : line.state === "upcoming" ? "text-white/55" : "";
        if (line.state !== "current" || !highlight) {
          return (
            <p
              key={`${index}-${line.text}`}
              className={`text-2xl leading-relaxed sm:text-3xl ${muted} ${
                line.state === "current" ? "font-semibold" : ""
              }`}
            >
              {line.text}
            </p>
          );
        }
        return (
          <p
            key={`${index}-${line.text}`}
            className="text-3xl font-semibold leading-relaxed sm:text-4xl"
          >
            {line.words.map((word, wordIndex) => (
              <span
                key={`${word.text}-${wordIndex}`}
                className={
                  word.active
                    ? "text-accent"
                    : word.done
                      ? "text-foreground"
                      : "text-white/35"
                }
              >
                {word.text}
                {wordIndex < line.words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
