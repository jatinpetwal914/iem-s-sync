"use client";

import { useActionState } from "react";
import { revokeInvite } from "@/features/invites/actions";
import { idleRevokeInviteState } from "@/features/invites/invite-action-state";
import { Button } from "@/components/ui/button";
import type { ActiveInvite } from "@/features/invites/types";

type ActiveInvitesListProps = {
  teamId: string;
  invites: ActiveInvite[];
};

export function ActiveInvitesList({ teamId, invites }: ActiveInvitesListProps) {
  if (invites.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted">
        No active invitations. Generate a link to invite members.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="border-b border-white/8 text-muted">
            <th className="py-3 pr-4 font-mono text-[10px] font-medium tracking-[0.22em]">
              CREATED
            </th>
            <th className="py-3 pr-4 font-mono text-[10px] font-medium tracking-[0.22em]">
              EXPIRES
            </th>
            <th className="py-3 pr-4 font-mono text-[10px] font-medium tracking-[0.22em]">
              USES
            </th>
            <th className="py-3 font-mono text-[10px] font-medium tracking-[0.22em]">
              REVOKE
            </th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id} className="border-b border-white/6">
              <td className="py-3 pr-4 text-foreground">
                {formatStamp(invite.createdAt)}
              </td>
              <td className="py-3 pr-4 text-foreground">
                {formatStamp(invite.expiresAt)}
              </td>
              <td className="py-3 pr-4 text-foreground">
                {invite.useCount} / {invite.maxUses}
              </td>
              <td className="py-3">
                <RevokeInviteButton teamId={teamId} inviteId={invite.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevokeInviteButton({
  teamId,
  inviteId,
}: {
  teamId: string;
  inviteId: string;
}) {
  const [state, action, pending] = useActionState(
    revokeInvite,
    idleRevokeInviteState,
  );

  return (
    <form action={action}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="inviteId" value={inviteId} />
      <Button
        type="submit"
        variant="ghost"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Revoking…" : "Revoke"}
      </Button>
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "mt-2 text-xs text-beat"
              : "mt-2 text-xs text-sync"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function formatStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
