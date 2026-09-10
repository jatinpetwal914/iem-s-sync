import { APP_DESCRIPTION, APP_PUNCHLINE } from "@/config/app";
import { BeatPulse } from "@/components/branding/beat-pulse";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-5 pb-10 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
      <div className="hero-orb hero-orb-left" aria-hidden="true" />
      <div className="hero-orb hero-orb-right" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="hero-copy rounded-full border border-white/12 bg-white/8 px-3 py-1 font-mono text-[10px] tracking-[0.28em] text-sync">
          IEM SYNC
        </p>
        <h1 className="hero-copy hero-copy-delay mt-5 text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl sm:leading-[1.05]">
          {APP_PUNCHLINE}.
        </h1>
        <p className="hero-copy hero-copy-delay-2 mt-4 max-w-xl text-base leading-7 text-muted sm:text-xl sm:leading-8">
          {APP_DESCRIPTION} Every ear hears the same downbeat.
        </p>

        <BeatPulse className="mt-8" />

        <div className="hero-copy hero-copy-delay-3 mt-6 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonLink href={routes.signup} variant="accent" className="min-h-14">
            Join IEM Sync
          </ButtonLink>
          <ButtonLink href={routes.login} variant="ghost" className="min-h-14">
            Log in
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
