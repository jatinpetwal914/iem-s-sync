"use client";

import { useActionState } from "react";
import { createTeam } from "@/features/teams/actions";
import { idleTeamActionState } from "@/features/teams/team-action-state";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(
    createTeam,
    idleTeamActionState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Team name" htmlFor="team-name">
        <Input
          id="team-name"
          name="name"
          required
          maxLength={80}
          disabled={pending}
          placeholder="Touring company, pit orchestra, house band…"
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
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Creating team…" : "Create team"}
      </Button>
    </form>
  );
}
