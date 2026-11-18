import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

export function DemoAuthNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-3.5 py-2.5 text-sm text-amber-strong">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
