"use client";

import { useActionState } from "react";
import { removeMembership } from "@/features/teams/membership-actions";
import { idleMembershipActionState } from "@/features/teams/membership-action-state";
import { Button } from "@/components/ui/button";

type RemoveMemberButtonProps = {
  teamId: string;
  membershipId: string;
};

export function RemoveMemberButton({
  teamId,
  membershipId,
}: RemoveMemberButtonProps) {
  const [state, action, pending] = useActionState(
    removeMembership,
    idleMembershipActionState,
  );

  return (
    <form action={action}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <Button type="submit" variant="ghost" disabled={pending} aria-busy={pending}>
        {pending ? "Removing…" : "Remove"}
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
