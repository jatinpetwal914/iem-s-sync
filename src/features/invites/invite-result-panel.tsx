import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { loginWithNext, signupWithNext, teamRoute, inviteRoute, routes } from "@/config/routes";
import { membershipStatusLabel, roleLabel } from "@/features/teams/labels";
import type { RedeemResult } from "@/features/invites/types";

type InviteResultPanelProps = {
  result: RedeemResult;
  token: string;
};

export function GuestInvitePanel({ nextPath }: { nextPath: string }) {
  return (
    <InviteShell
      eyebrow="INVITATION"
      title="Sign in to join this team"
      message="Log in or create an account. After that we will check this invitation and, if it is valid, send a membership request."
    >
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={loginWithNext(nextPath)}>Log in</ButtonLink>
        <ButtonLink href={signupWithNext(nextPath)} variant="accent">
          Sign up
        </ButtonLink>
      </div>
    </InviteShell>
  );
}

export function InviteResultPanel({ result, token }: InviteResultPanelProps) {
  switch (result.outcome) {
    case "unauthenticated":
      return <GuestInvitePanel nextPath={inviteRoute(token)} />;
    case "expired":
      return (
        <InviteShell
          eyebrow="EXPIRED"
          title="This invitation has expired"
          message="Ask the team owner for a new link."
          actionHref={routes.home}
          actionLabel="Back home"
        />
      );
    case "revoked":
      return (
        <InviteShell
          eyebrow="REVOKED"
          title="This invitation was revoked"
          message="The owner cancelled this link. Request a new invitation if you still need access."
          actionHref={routes.home}
          actionLabel="Back home"
        />
      );
    case "invalid":
      return (
        <InviteShell
          eyebrow="INVALID"
          title="This invitation is not valid"
          message="The link is missing, already used up, or does not match a real invitation."
          actionHref={routes.home}
          actionLabel="Back home"
        />
      );
    case "already_member":
      return (
        <InviteShell
          eyebrow="ALREADY A MEMBER"
          title="You are already on this team"
          message={alreadyMemberMessage(result)}
          actionHref={result.teamId ? teamRoute(result.teamId) : routes.dashboard}
          actionLabel="Open team"
        />
      );
    case "requested":
      return (
        <InviteShell
          eyebrow="REQUEST SENT"
          title={result.teamName ? `Asked to join ${result.teamName}` : "Membership requested"}
          message="Your membership is pending. An owner or admin can approve you. PlayBox stays locked until you are approved."
          actionHref={result.teamId ? teamRoute(result.teamId) : routes.dashboard}
          actionLabel="View team"
        />
      );
  }
}

function alreadyMemberMessage(result: RedeemResult): string {
  const team = result.teamName ?? "this team";
  if (result.role && result.membershipStatus) {
    return `You already belong to ${team} as ${roleLabel(result.role)} (${membershipStatusLabel(result.membershipStatus)}).`;
  }

  return `You already have a membership on ${team}.`;
}

function InviteShell({
  eyebrow,
  title,
  message,
  actionHref,
  actionLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16">
      <p className="font-mono text-[11px] tracking-[0.28em] text-accent">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">{message}</p>
      {children}
      {actionHref && actionLabel ? (
        <div className="mt-8">
          <ButtonLink href={actionHref}>{actionLabel}</ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
