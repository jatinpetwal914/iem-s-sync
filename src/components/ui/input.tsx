import type { InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-2xl border border-white/12 bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}
