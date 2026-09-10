import type { Metadata } from "next";
import { CredentialsForm } from "@/features/auth/credentials-form";
import { redirectIfAuthenticated } from "@/features/auth/require-user";
import { Panel } from "@/components/ui/panel";
import { TextLink } from "@/components/ui/text-link";
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <p className="font-mono text-[11px] tracking-[0.28em] text-sync">
        MEMBER ACCESS
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Log in</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Use your IEM Sync account. Sessions stay in secure cookies, not
        localStorage.
      </p>
      <Panel className="mt-8">
        <CredentialsForm
          mode="login"
          nextPath={nextPath}
          initialMessage={loginErrorMessage(params.error)}
        />
      </Panel>
      <p className="mt-6 text-sm text-muted">
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
