import type { Metadata } from "next";
import { CredentialsForm } from "@/features/auth/credentials-form";
import { redirectIfAuthenticated } from "@/features/auth/require-user";
import { BeatPulse } from "@/components/branding/beat-pulse";
import { Panel } from "@/components/ui/panel";
import { TextLink } from "@/components/ui/text-link";
import { APP_PUNCHLINE } from "@/config/app";
import { safeNextPath, signupWithNext } from "@/config/routes";

export const metadata: Metadata = {
  title: "Log in",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  await redirectIfAuthenticated(nextPath);

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center overflow-hidden px-5 py-8">
      <BeatPulse compact />
      <p className="mt-2 text-center font-mono text-[11px] tracking-[0.28em] text-sync">
        MEMBER ACCESS
      </p>
      <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight">
        Log in
      </h1>
      <p className="mt-3 text-center text-sm leading-6 text-muted">
        {APP_PUNCHLINE}. Sessions stay in secure cookies, not localStorage.
      </p>
      <Panel className="mt-6">
        <CredentialsForm
          mode="login"
          nextPath={nextPath}
          initialMessage={loginErrorMessage(params.error)}
        />
      </Panel>
      <p className="mt-6 text-center text-sm text-muted">
        Need an account?{" "}
        <TextLink href={signupWithNext(nextPath)}>Sign up</TextLink>
      </p>
    </div>
  );
}

function loginErrorMessage(error: string | undefined): string | null {
  if (error === "confirmation") {
    return "Email confirmation failed or expired. Request a new link or try signing in again.";
  }

  if (error === "session") {
    return "Your session expired. Please sign in again.";
  }

  return null;
}
