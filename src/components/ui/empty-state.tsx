import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-line bg-primary-softer/60 px-5 py-8 text-center",
        className,
      )}
    >
      <span aria-hidden className="mb-3 grid size-12 place-items-center rounded-2xl bg-white text-primary shadow-sm">
        <Icon className="size-6" strokeWidth={2} />
      </span>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
