"use client";

import { useActionState } from "react";
import { createInvite } from "@/features/invites/actions";
import { idleCreateInviteState } from "@/features/invites/invite-action-state";
import { InviteShareControls } from "@/features/invites/invite-share-controls";
import { Button } from "@/components/ui/button";

type GenerateInviteFormProps = {
  teamId: string;
};

export function GenerateInviteForm({ teamId }: GenerateInviteFormProps) {
  const [state, action, pending] = useActionState(
    createInvite,
    idleCreateInviteState,
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="teamId" value={teamId} />
        <p className="text-sm leading-6 text-muted">
          Creates a link with a random token, a 7-day expiration, and a 20-use
          limit. The URL never includes a role.
        </p>
        {state.message && state.status === "error" ? (
          <p className="text-sm leading-6 text-beat" role="alert">
            {state.message}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Generating…" : "Generate invitation"}
          </Button>
        </div>
      </form>
      {state.status === "created" && state.inviteUrl ? (
        <InviteShareControls
          inviteUrl={state.inviteUrl}
          expiresAt={state.expiresAt}
          maxUses={state.maxUses}
          notice={state.message}
        />
      ) : null}
    </div>
  );
}
