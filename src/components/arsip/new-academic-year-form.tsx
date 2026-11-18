"use client";

import { CalendarPlus } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { startNewAcademicYearAction } from "@/app/(app)/arsip/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";

/**
 * Mulai tahun ajaran baru (F09). Konfirmasi menjelaskan bahwa tahun aktif diarsipkan (bukan dihapus)
 * dan progres/catatan lama tidak ikut disalin.
 */
export function NewAcademicYearForm({ activeLabel, suggestedLabel }: { activeLabel: string | null; suggestedLabel: string }) {
  const [state, formAction] = useActionState(startNewAcademicYearAction, IDLE_STATE);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [copyClasses, setCopyClasses] = useState(valueOf(state, "copyClasses", "on") === "on");
  const [label, setLabel] = useState(valueOf(state, "label", suggestedLabel) ?? suggestedLabel);
  const err = fieldError(state, "label");
  // Bila gagal, tutup dialog agar pesan kesalahan di form terlihat.
  useEffect(() => {
    if (state.status === "error") dialogRef.current?.close();
  }, [state]);

  return (
    <form action={formAction} noValidate className="space-y-4">
      <p className="pr-8 font-semibold text-ink">Mulai tahun ajaran baru</p>
      <Field id="newYearLabel" label="Tahun ajaran baru" error={err} hint="Tanggal default 1 Juli–30 Juni; bisa diubah di Pengaturan.">
        <TextInput
          id="newYearLabel"
          name="label"
          inputMode="numeric"
          placeholder="2027/2028"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          error={err}
          hasHint
        />
      </Field>
      <fieldset className="space-y-2.5">
        <legend className="text-[15px] font-semibold text-ink">Salin dari {activeLabel ?? "tahun sebelumnya"}</legend>
        <label className="flex items-start gap-2.5 text-[15px] text-ink">
          <input
            type="checkbox"
            name="copyClasses"
            checked={copyClasses}
            onChange={(e) => setCopyClasses(e.target.checked)}
            className="mt-0.5 size-5 accent-primary"
          />
          <span>Kelas (tingkat & rombel sama; kelas yang diarsipkan tidak ikut)</span>
        </label>
        <label className="flex items-start gap-2.5 text-[15px] text-ink">
          <input type="checkbox" name="copyPlans" defaultChecked disabled={!copyClasses} className="mt-0.5 size-5 accent-primary" />
          <span>Rencana materi (topik, urutan, jumlah pertemuan, file materi) — progres dan catatan tidak disalin</span>
        </label>
        <label className="flex items-start gap-2.5 text-[15px] text-ink">
          <input type="checkbox" name="copySchedules" disabled={!copyClasses} className="mt-0.5 size-5 accent-primary" />
          <span>Jadwal mingguan (bisa diubah lagi di Jadwal)</span>
        </label>
      </fieldset>
      <FormMessage state={state} />
      <Button onClick={() => dialogRef.current?.showModal()}>
        <CalendarPlus aria-hidden className="size-5" /> Lanjutkan
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto w-[min(92vw,460px)] rounded-[var(--radius-card)] border border-line bg-white p-0 shadow-[var(--shadow-pop)]"
      >
        <div className="space-y-3 p-6">
          <h2 id={titleId} className="text-xl font-bold text-ink">
            Mulai tahun ajaran {label || suggestedLabel}?
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink-muted">
            {activeLabel ? (
              <li>
                Tahun ajaran <strong className="text-ink">{activeLabel}</strong> diarsipkan: tetap tersimpan utuh, bisa
                dibaca dan dipulihkan dari Arsip.
              </li>
            ) : null}
            <li>Progres dan catatan pertemuan lama tidak disalin ke tahun baru.</li>
            <li>File di Bank Materi tetap sama dan bisa dipakai lagi.</li>
          </ul>
          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              Batal
            </Button>
            <SubmitButton pendingLabel="Menyiapkan tahun baru…">Ya, Mulai Tahun Baru</SubmitButton>
          </div>
        </div>
      </dialog>
    </form>
  );
}
