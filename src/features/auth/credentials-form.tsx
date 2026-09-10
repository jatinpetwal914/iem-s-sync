"use client";

import { useActionState } from "react";
import {
  signIn,
  signUp,
} from "@/features/auth/actions";
import {
  idleAuthActionState,
  type AuthActionState,
} from "@/features/auth/auth-action-state";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type CredentialsFormProps = {
  mode: "login" | "signup";
  nextPath?: string;
  initialMessage?: string | null;
};

export function CredentialsForm({
  mode,
  nextPath,
  initialMessage,
}: CredentialsFormProps) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(
    action,
    idleAuthActionState,
  );
  const submitLabel = mode === "login" ? "Log in" : "Create account";
  const pendingLabel = mode === "login" ? "Signing in…" : "Creating account…";
  const visibleState = hasVisibleState(state) ? state : null;
  const banner = visibleState ?? messageState(initialMessage);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="you@band.studio"
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          disabled={pending}
          placeholder="At least 8 characters"
        />
      </Field>
      {banner?.issues?.length ? (
        <ul className="space-y-1 text-sm text-beat" role="alert">
          {banner.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      {banner?.message ? (
        <p
          className={
            banner.status === "needs_confirmation"
              ? "text-sm leading-6 text-sync"
              : "text-sm leading-6 text-beat"
          }
          role="status"
        >
          {banner.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

function hasVisibleState(state: AuthActionState): boolean {
  return Boolean(
    state &&
      state.status !== "idle" &&
      (state.message || state.issues?.length),
  );
}

function messageState(message: string | null | undefined): AuthActionState | null {
  if (!message) {
    return null;
  }

  return {
    status: "error",
    issues: [],
    message,
  };
}
