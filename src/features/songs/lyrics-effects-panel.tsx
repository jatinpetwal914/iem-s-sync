"use client";

import { LYRICS_EFFECT_OPTIONS, type LyricsSettings } from "@/lib/lyrics/types";

type LyricsEffectsPanelProps = {
  open: boolean;
  settings: LyricsSettings;
  usingSongDefault: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<LyricsSettings>) => void;
  onUseSongDefault: () => void;
};

export function LyricsEffectsPanel({
  open,
  settings,
  usingSongDefault,
  onToggle,
  onChange,
  onUseSongDefault,
}: LyricsEffectsPanelProps) {
  return (
    <div className="mt-5">
      <button type="button" className="studio-action" onClick={onToggle}>
        {open ? "Close effects" : "Effects"}
      </button>
      {open ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted">LYRICS EFFECT</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LYRICS_EFFECT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`studio-action ${
                  settings.effect === option.id ? "border-accent bg-accent/15" : ""
                }`}
                onClick={() => onChange({ effect: option.id })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="font-mono text-[10px] tracking-[0.16em] text-muted">
              Transition
              <select
                className="studio-input mt-1"
                value={settings.transition}
                onChange={(event) =>
                  onChange({
                    transition: event.target.value === "instant" ? "instant" : "smooth",
                  })
                }
              >
                <option value="smooth">Smooth</option>
                <option value="instant">Instant</option>
              </select>
            </label>
            <label className="font-mono text-[10px] tracking-[0.16em] text-muted">
              Speed
              <select
                className="studio-input mt-1"
                value={settings.speed}
                onChange={(event) =>
                  onChange({
                    speed:
                      event.target.value === "slow"
                        ? "slow"
                        : event.target.value === "fast"
                          ? "fast"
                          : "normal",
                  })
                }
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </label>
            <label className="font-mono text-[10px] tracking-[0.16em] text-muted">
              Upcoming
              <select
                className="studio-input mt-1"
                value={settings.upcomingLines}
                onChange={(event) =>
                  onChange({
                    upcomingLines: Number(event.target.value) as 1 | 2 | 3,
                  })
                }
              >
                <option value={1}>1 line</option>
                <option value={2}>2 lines</option>
                <option value={3}>3 lines</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoAdvance}
                onChange={(event) => onChange({ autoAdvance: event.target.checked })}
              />
              Auto advance
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.highlight}
                onChange={(event) => onChange({ highlight: event.target.checked })}
              />
              Highlight
            </label>
          </div>
          {!usingSongDefault ? (
            <button
              type="button"
              className="studio-action mt-3"
              onClick={onUseSongDefault}
            >
              Use song default
            </button>
          ) : (
            <p className="mt-3 font-mono text-[10px] text-muted">Using song default</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
