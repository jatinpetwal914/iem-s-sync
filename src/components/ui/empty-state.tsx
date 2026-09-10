import { ButtonLink } from "@/components/ui/button";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  eyebrow = "EMPTY",
  title,
  message,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16">
      <p className="font-mono text-[11px] tracking-[0.28em] text-muted">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">{message}</p>
      {actionHref && actionLabel ? (
        <div className="mt-8">
          <ButtonLink href={actionHref}>{actionLabel}</ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
