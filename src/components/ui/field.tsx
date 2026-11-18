import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "block h-12 w-full rounded-xl border border-line-strong/60 bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-subtle transition-colors hover:border-line-strong " +
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 " +
  "aria-[invalid=true]:border-rose-strong aria-[invalid=true]:ring-rose-strong/10";

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[15px] font-semibold text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-muted">(opsional)</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-rose-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Input yang otomatis menautkan aria-describedby ke hint/error milik <Field>. */
export function TextInput({
  id,
  error,
  hasHint,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; error?: string; hasHint?: boolean }) {
  const describedBy = error ? `${id}-error` : hasHint ? `${id}-hint` : undefined;
  return (
    <input
      id={id}
      name={props.name ?? id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={cn(inputClass, className)}
      {...props}
    />
  );
}
