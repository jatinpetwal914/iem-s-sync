import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "ghost" | "accent" | "beat" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:bg-zinc-200 active:bg-white",
  ghost:
    "border border-white/12 bg-transparent text-foreground hover:border-white/30 hover:bg-white/5",
  accent: "bg-accent text-background hover:bg-amber-300 active:bg-amber-200",
  beat: "bg-beat text-white hover:bg-rose-400 active:bg-rose-300",
  danger: "border border-beat/40 bg-beat/10 text-beat hover:bg-beat/20",
};

const buttonLayout =
  "inline-flex min-h-12 min-w-12 items-center justify-center rounded-full px-5 text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonLayout, variantClasses[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(buttonLayout, variantClasses[variant], className)}
    >
      {children}
    </Link>
  );
}
