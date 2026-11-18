import { Construction } from "lucide-react";
import type { ReactNode } from "react";

/** Catatan pengembangan: fitur kelola/ubah data belum aktif pada fase ini. */
export function PhaseNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-dashed border-line bg-white/70 px-3.5 py-2.5 text-sm text-ink-muted">
      <Construction aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
      <span>{children}</span>
    </p>
  );
}
