import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/config/app";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function Hero() {
  return (
    <div className="flex flex-col gap-8">
      <p className="font-mono text-[11px] tracking-[0.32em] text-sync">
        MASTER CLOCK · LOCAL AUDIO
      </p>
      <div className="max-w-3xl space-y-5">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl sm:leading-[1.05]">
          {APP_NAME}
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted sm:text-xl">
          {APP_TAGLINE}. {APP_DESCRIPTION} The network carries timing. Each
          device generates its own click.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={routes.signup}>Sign up</ButtonLink>
        <ButtonLink href={routes.login} variant="ghost">
          Log in
        </ButtonLink>
        <ButtonLink href={routes.dashboard} variant="ghost">
          Dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
