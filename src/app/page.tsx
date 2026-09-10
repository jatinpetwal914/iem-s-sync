import { GenreRail } from "@/components/landing/genre-rail";
import { Hero } from "@/components/landing/hero";
import { SignalPath } from "@/components/landing/signal-path";
import { TempoReference } from "@/components/landing/tempo-reference";
import { Panel } from "@/components/ui/panel";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-10">
      <Hero />

      <Panel>
        <p className="mb-4 font-mono text-[10px] tracking-[0.24em] text-muted">
          SIGNAL PATH
        </p>
        <SignalPath />
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
            TEMPO REFERENCE
          </p>
          <p className="text-sm text-muted">
            120 BPM at 44.1 kHz from the shared tempo module
          </p>
        </div>
        <TempoReference />
      </Panel>

      <Panel>
        <p className="mb-4 font-mono text-[10px] tracking-[0.24em] text-muted">
          GENRE PALETTE
        </p>
        <p className="mb-4 max-w-2xl text-sm leading-6 text-muted">
          Recommended ranges only. The owner can set any BPM; genre never locks
          tempo.
        </p>
        <GenreRail />
      </Panel>
    </div>
  );
}
