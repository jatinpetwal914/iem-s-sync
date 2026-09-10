"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  variant?: "primary" | "ghost" | "accent";
  className?: string;
};

export function LogoutButton({
  variant = "ghost",
  className,
}: LogoutButtonProps) {
  return (
    <form action={signOut}>
      <LogoutSubmit variant={variant} className={className} />
    </form>
  );
}

function LogoutSubmit({
  variant,
  className,
}: {
  variant: "primary" | "ghost" | "accent";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Signing out…" : "Log out"}
    </Button>
  );
}
