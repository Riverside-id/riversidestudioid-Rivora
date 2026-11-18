"use client";

import { Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tombol bergaris putus "＋ Tambah …" yang membuka form di tempat. Saat tidak bisa mengedit
 * (mode demo / arsip) tombol tampil nonaktif dengan alasan yang jelas.
 */
export function InlineAddPanel({
  label,
  disabledReason,
  children,
  className,
}: {
  label: string;
  disabledReason?: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={Boolean(disabledReason)}
          title={disabledReason}
          className="flex h-full min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-3 text-[15px] font-semibold text-primary-strong transition-colors hover:border-primary/40 hover:bg-primary-softer disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:border-line disabled:hover:bg-transparent"
        >
          <Plus aria-hidden className="size-5" /> {label}
        </button>
        {disabledReason ? <p className="mt-1.5 text-center text-xs text-ink-muted">{disabledReason}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-2xl border border-primary/30 bg-primary-softer/60 p-4", className)}>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Tutup form"
        className="absolute top-2 right-2 grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-white"
      >
        <X aria-hidden className="size-5" />
      </button>
      {children}
    </div>
  );
}
