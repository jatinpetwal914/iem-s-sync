import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16">
      <p className="font-mono text-[11px] tracking-[0.28em] text-beat">ERROR</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">{message}</p>
      {onRetry ? (
        <div className="mt-8">
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
