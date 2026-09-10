import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";

type ProtectedStateProps = {
  authenticated: boolean;
};

export function ProtectedState({ authenticated }: ProtectedStateProps) {
  if (!authenticated) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16">
        <p className="font-mono text-[11px] tracking-[0.28em] text-accent">
          PROTECTED
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Sign in required
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          The dashboard is reserved for authenticated members. This check uses
          the real Supabase session. No mock user is injected.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={routes.login}>Log in</ButtonLink>
          <ButtonLink href={routes.signup} variant="ghost">
            Create account
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10 sm:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-sync">
        AUTHENTICATED
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="max-w-xl text-sm leading-6 text-muted">
        Session verified. Team, invite, and beat-control surfaces are not
        enabled in this phase.
      </p>
    </div>
  );
}
