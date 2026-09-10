"use client";

import { useActionState } from "react";
import { updateTeamName } from "@/features/teams/actions";
import { idleTeamActionState } from "@/features/teams/team-action-state";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type RenameTeamFormProps = {
  teamId: string;
  currentName: string;
};

export function RenameTeamForm({ teamId, currentName }: RenameTeamFormProps) {
  const [state, action, pending] = useActionState(
    updateTeamName,
    idleTeamActionState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="teamId" value={teamId} />
      <Field label="Team name" htmlFor="rename-team">
        <Input
          id="rename-team"
          name="name"
          required
          maxLength={80}
          disabled={pending}
          defaultValue={currentName}
        />
      </Field>
      {state.issues.length > 0 ? (
        <ul className="space-y-1 text-sm text-beat" role="alert">
          {state.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      {state.message ? (
        <p className="text-sm leading-6 text-beat" role="status">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
      </div>
    </form>
  );
}
