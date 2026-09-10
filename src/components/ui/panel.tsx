import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-[1.75rem] border border-white/10 bg-surface/85 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
