"use client";

import { useActionState } from "react";
import {
  approveMembership,
  rejectMembership,
} from "@/features/teams/membership-actions";
import { idleMembershipActionState } from "@/features/teams/membership-action-state";
import { Button } from "@/components/ui/button";
import type { TeamMemberRow } from "@/features/teams/types";

type JoinRequestsListProps = {
  teamId: string;
  requests: TeamMemberRow[];
};

export function JoinRequestsList({ teamId, requests }: JoinRequestsListProps) {
  if (requests.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted">
        No join requests yet. Share an invitation to let people ask to connect.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {requests.map((request) => (
        <li
          key={request.membershipId}
          className="rounded-2xl border border-white/8 px-4 py-4"
        >
          <p className="font-mono text-[10px] tracking-[0.22em] text-accent">
            NEW JOIN REQUEST
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <RequestStat label="Member name" value={memberName(request)} />
            <RequestStat label="Email" value={request.email ?? "Not available"} />
            <RequestStat label="Request time" value={formatStamp(request.requestedAt)} />
          </dl>
          <JoinRequestActions teamId={teamId} membershipId={request.membershipId} />
        </li>
      ))}
    </ul>
  );
}

function JoinRequestActions({
  teamId,
  membershipId,
}: {
  teamId: string;
  membershipId: string;
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveMembership,
    idleMembershipActionState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectMembership,
    idleMembershipActionState,
  );
  const pending = approvePending || rejectPending;
  const message = approveState.message ?? rejectState.message;
  const messageStatus =
    approveState.status === "error" || rejectState.status === "error"
      ? "error"
      : approveState.status === "success" || rejectState.status === "success"
        ? "success"
        : null;

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={approveAction}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="membershipId" value={membershipId} />
          <Button type="submit" variant="accent" disabled={pending} aria-busy={pending}>
            {approvePending ? "Connecting…" : "Approve & Connect"}
          </Button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="membershipId" value={membershipId} />
          <Button type="submit" variant="ghost" disabled={pending} aria-busy={pending}>
            {rejectPending ? "Rejecting…" : "Reject"}
          </Button>
        </form>
      </div>
      {message && messageStatus ? (
        <p
          className={
            messageStatus === "error"
              ? "text-sm leading-6 text-beat"
              : "text-sm leading-6 text-sync"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function RequestStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.22em] text-muted">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function memberName(request: TeamMemberRow): string {
  return request.displayName ?? request.email ?? `Member ${request.userId.slice(0, 8)}`;
}

function formatStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
