"use client";

import { CalendarRange, ChevronDown } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { selectSemester } from "@/app/(app)/actions";
import type { PeriodOption } from "@/lib/services/app-context";
import { cn } from "@/lib/utils";

/**
 * Satu kontrol ringkas untuk Tahun Ajaran + Semester. Memakai <select> native (paling mudah
 * di ponsel dan pembaca layar) yang ditumpuk transparan di atas label tampilan, sehingga teks
 * yang terlihat bisa dipendekkan di layar sempit tanpa kehilangan aksesibilitas.
 * Mengganti semester yang DILIHAT, bukan semester aktif.
 */
export function PeriodSwitcher({
  options,
  selectedId,
  className,
}: {
  options: PeriodOption[];
  selectedId: string | null;
  className?: string;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shownId, setShownId] = useState(selectedId);
  // Sinkronkan saat server mengirim pilihan baru (setelah refresh).
  const [lastServerId, setLastServerId] = useState(selectedId);
  if (selectedId !== lastServerId) {
    setLastServerId(selectedId);
    setShownId(selectedId);
  }

  if (options.length === 0) return null;
  const shown = options.find((o) => o.semesterId === shownId) ?? options[0];

  return (
    <div className={className}>
      <div
        className={cn(
          "relative flex h-11 items-center gap-2.5 rounded-xl border border-line bg-white pr-9 pl-3.5 shadow-[var(--shadow-card)] transition-colors",
          "focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 hover:border-primary/40",
          pending && "opacity-70",
        )}
      >
        <CalendarRange aria-hidden className="size-5 shrink-0 text-primary" />
        <span aria-hidden className="truncate text-[15px] font-semibold text-ink">
          <span className="sm:hidden">{shown.shortLabel}</span>
          <span className="hidden sm:inline">{shown.label}</span>
        </span>
        <ChevronDown aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" />
        <label htmlFor={id} className="sr-only">
          Pilih tahun ajaran dan semester
        </label>
        <select
          id={id}
          value={shownId ?? ""}
          disabled={pending}
          aria-busy={pending}
          onChange={(e) => {
            const next = e.target.value;
            setError(null);
            setShownId(next);
            startTransition(async () => {
              const result = await selectSemester(next);
              if (!result.ok) {
                setError(result.message);
                setShownId(selectedId);
              }
            });
          }}
          className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-wait"
        >
          {options.map((o) => (
            <option key={o.semesterId} value={o.semesterId}>
              {o.label}
              {o.isActive ? " — aktif" : ""}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-sm font-medium text-rose-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}
