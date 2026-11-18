"use client";

import { ArchiveRestore, Download, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { restoreMaterialAction } from "@/app/(app)/materi/actions";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { MATERIAL_KIND_LABEL } from "@/lib/domain/labels";
import type { MaterialKind } from "@/lib/domain/types";
import { formatFileSize, isMaterialFileKind, opensInBrowser } from "@/lib/materials/file-rules";
import { cn } from "@/lib/utils";

export interface ArchivedMaterialItem {
  id: string;
  title: string;
  kind: MaterialKind;
  topic: string | null;
  gradeLevel: number | null;
  fileSize: number | null;
  hasFile: boolean;
  archivedOn: string;
}

/** Materi diarsipkan: cari, buka/unduh file (tetap di Storage), dan pulihkan ke Bank Materi. */
export function ArchivedMaterials({ items, canRestore }: { items: ArchivedMaterialItem[]; canRestore: boolean }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => `${m.title} ${m.topic ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="space-y-3">
      {items.length > 3 ? (
        <label className="relative block">
          <span className="sr-only">Cari materi diarsipkan</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul atau topik…"
            className={cn(inputClass, "pl-11")}
          />
        </label>
      ) : null}
      {shown.length > 0 ? (
        <ul className="space-y-2.5">
          {shown.map((m) => {
            const kind = isMaterialFileKind(m.kind) ? m.kind : null;
            const inBrowser = kind ? opensInBrowser(kind) : false;
            const meta = [
              MATERIAL_KIND_LABEL[m.kind],
              m.fileSize ? formatFileSize(m.fileSize) : null,
              m.gradeLevel ? `Kelas ${m.gradeLevel}` : null,
              m.topic,
              `diarsipkan ${m.archivedOn}`,
            ].filter(Boolean);
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words text-ink">{m.title}</p>
                  <p className="text-sm text-ink-muted">{meta.join(" · ")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {kind && m.hasFile ? (
                    <a
                      href={`/materi/${m.id}/berkas`}
                      target={inBrowser ? "_blank" : undefined}
                      rel={inBrowser ? "noopener noreferrer" : undefined}
                      aria-label={`${inBrowser ? "Buka" : "Unduh"} materi arsip ${m.title}`}
                      className={buttonClass("ghost", "sm")}
                    >
                      {inBrowser ? <ExternalLink aria-hidden className="size-4" /> : <Download aria-hidden className="size-4" />}
                      {inBrowser ? "Buka" : "Unduh"}
                    </a>
                  ) : null}
                  {canRestore ? (
                    <ActionButton action={restoreMaterialAction} fields={{ materialId: m.id }} label={`Pulihkan materi ${m.title}`}>
                      <ArchiveRestore aria-hidden className="size-4" /> Pulihkan
                    </ActionButton>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[15px] text-ink-muted">Tidak ada materi diarsipkan yang cocok dengan pencarian.</p>
      )}
    </div>
  );
}
