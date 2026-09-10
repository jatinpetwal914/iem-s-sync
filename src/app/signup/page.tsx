import type { Metadata } from "next";
import { CredentialsForm } from "@/features/auth/credentials-form";
import { redirectIfAuthenticated } from "@/features/auth/require-user";
import { BeatPulse } from "@/components/branding/beat-pulse";
import { Panel } from "@/components/ui/panel";
import { TextLink } from "@/components/ui/text-link";
import { APP_PUNCHLINE } from "@/config/app";
import { loginWithNext, safeNextPath } from "@/config/routes";

export const metadata: Metadata = {
  title: "Sign up",
};

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  await redirectIfAuthenticated(nextPath);

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center overflow-hidden px-5 py-8">
      <BeatPulse compact />
      <p className="mt-2 text-center font-mono text-[11px] tracking-[0.28em] text-accent">
        NEW MEMBER
      </p>
      <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight">
        Sign up
      </h1>
      <p className="mt-3 text-center text-sm leading-6 text-muted">
        {APP_PUNCHLINE}. Create an account, then continue to your invitation or
        dashboard.
      </p>
      <Panel className="mt-6">
        <CredentialsForm mode="signup" nextPath={nextPath} />
      </Panel>
      <p className="mt-6 text-center text-sm text-muted">
        Already have access?{" "}
        <TextLink href={loginWithNext(nextPath)}>Log in</TextLink>
      </p>
    </div>
  );
}
