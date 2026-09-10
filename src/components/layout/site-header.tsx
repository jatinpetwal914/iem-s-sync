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
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/8 bg-background/40 px-4 py-3 backdrop-blur-md sm:px-8 sm:py-4">
      <Link href={routes.home} aria-label="IEM Sync home">
        <Wordmark compact />
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
              className="min-h-11 max-sm:hidden"
            >
              Log in
            </ButtonLink>
            <ButtonLink href={routes.signup} variant="accent" className="min-h-11 px-4">
              Sign up
            </ButtonLink>
          </>
        )}
      </nav>
    </header>
  );
}
