import type { Metadata } from "next";
import { CredentialsForm } from "@/features/auth/credentials-form";
import { redirectIfAuthenticated } from "@/features/auth/require-user";
import { Panel } from "@/components/ui/panel";
import { TextLink } from "@/components/ui/text-link";
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <p className="font-mono text-[11px] tracking-[0.28em] text-accent">
        NEW MEMBER
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Sign up</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Create an account. A profile is created with your user, then you
        continue to the invitation or dashboard.
      </p>
      <Panel className="mt-8">
        <CredentialsForm mode="signup" nextPath={nextPath} />
      </Panel>
      <p className="mt-6 text-sm text-muted">
        Already have access?{" "}
        <TextLink href={loginWithNext(nextPath)}>Log in</TextLink>
      </p>
    </div>
  );
}
