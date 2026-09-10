import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";

type TextLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function TextLink({ href, children, className }: TextLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "font-semibold text-foreground underline decoration-white/20 underline-offset-4 hover:decoration-accent",
        className,
      )}
    >
      {children}
    </Link>
  );
}
