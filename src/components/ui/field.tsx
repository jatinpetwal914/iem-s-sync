import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="font-mono text-[10px] tracking-[0.22em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
