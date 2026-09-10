import Link from "next/link";
import { Wordmark } from "@/components/branding/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/logout-button";
import { getAuthGateState } from "@/features/auth/get-auth-gate-state";
import { routes } from "@/config/routes";

export async function SiteHeader() {
  const gate = await getAuthGateState();
  const authenticated = gate === "authenticated";

  return (
    <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link href={routes.home} aria-label="IEM Sync home">
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-2">
        {authenticated ? (
          <>
            <ButtonLink
              href={routes.dashboard}
              variant="ghost"
              className="hidden sm:inline-flex"
            >
              Dashboard
            </ButtonLink>
            <ButtonLink
              href={routes.team}
              variant="ghost"
              className="hidden sm:inline-flex"
            >
              Team
            </ButtonLink>
            <ButtonLink
              href={routes.playbox}
              variant="ghost"
              className="hidden sm:inline-flex"
            >
              PlayBox
            </ButtonLink>
            <LogoutButton />
          </>
        ) : (
          <>
            <ButtonLink
              href={routes.login}
              variant="ghost"
              className="hidden sm:inline-flex"
            >
              Log in
            </ButtonLink>
            <ButtonLink href={routes.signup} variant="accent">
              Sign up
            </ButtonLink>
          </>
        )}
      </nav>
    </header>
  );
}
