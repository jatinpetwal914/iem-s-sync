"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      message={error.message || "The application hit an unexpected error."}
      onRetry={reset}
    />
  );
}
