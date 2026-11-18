import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("card p-5 sm:p-6", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  titleId,
  iconClassName = "text-primary",
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  titleId?: string;
  iconClassName?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <Icon aria-hidden className={cn("mt-0.5 size-7 shrink-0", iconClassName)} strokeWidth={2} />
        ) : null}
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl font-bold leading-tight text-ink sm:text-[22px]">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
