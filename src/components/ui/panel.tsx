import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-3xl border border-white/8 bg-surface p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
