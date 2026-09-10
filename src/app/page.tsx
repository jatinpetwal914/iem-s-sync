import { GenreRail } from "@/components/landing/genre-rail";
import { Hero } from "@/components/landing/hero";
import { LandingLines } from "@/components/landing/landing-lines";
import { SignalPath } from "@/components/landing/signal-path";
import { TempoReference } from "@/components/landing/tempo-reference";
import { Panel } from "@/components/ui/panel";

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <Hero />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 pb-12 sm:px-8">
        <LandingLines />

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
            Recommended ranges only. The owner can set any BPM; genre never
            locks tempo.
          </p>
          <GenreRail />
        </Panel>
      </div>
    </div>
  );
}
