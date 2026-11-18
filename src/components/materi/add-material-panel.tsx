"use client";

import { FileUp, Link2, StickyNote } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LinkMaterialForm } from "./link-material-form";
import { NoteMaterialForm } from "./note-material-form";
import { UploadMaterialForm } from "./upload-material-form";

const TABS = [
  { id: "file", label: "File", Icon: FileUp },
  { id: "link", label: "Tautan", Icon: Link2 },
  { id: "note", label: "Catatan", Icon: StickyNote },
] as const;

/** Tambah materi: file (PDF/Word/PowerPoint), tautan video/referensi, atau catatan teks. */
export function AddMaterialPanel({ supabaseUrl, publishableKey }: { supabaseUrl: string; publishableKey: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("file");
  return (
    <div className="space-y-4">
      <p className="pr-8 font-semibold text-ink">Tambah materi</p>
      <div role="tablist" aria-label="Jenis materi" className="inline-flex rounded-xl bg-white p-1 shadow-[inset_0_0_0_1px_var(--color-line)]">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-[15px] font-semibold transition-colors",
              tab === id ? "bg-primary text-white" : "text-ink-muted hover:bg-primary-softer hover:text-ink",
            )}
          >
            <Icon aria-hidden className="size-4" /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "file" ? <UploadMaterialForm supabaseUrl={supabaseUrl} publishableKey={publishableKey} hideHeading /> : null}
        {tab === "link" ? <LinkMaterialForm /> : null}
        {tab === "note" ? <NoteMaterialForm /> : null}
      </div>
    </div>
  );
}
