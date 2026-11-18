"use client";

import { Pencil } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import { updateClassAction } from "@/app/(app)/jadwal/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import type { GradeLevel } from "@/lib/domain/types";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";

/** Ubah tingkat/rombel kelas. Jadwal, rencana, dan riwayat tetap terhubung ke kelas yang sama. */
export function EditClassDialog({
  classId,
  classLabel,
  gradeLevel,
  section,
}: {
  classId: string;
  classLabel: string;
  gradeLevel: GradeLevel;
  section: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, formAction] = useActionState(updateClassAction, IDLE_STATE);
  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state]);
  const err = (field: string) => fieldError(state, field);

  return (
    <>
      <button
        type="button"
        aria-label={`Ubah Kelas ${classLabel}`}
        onClick={() => dialogRef.current?.showModal()}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-primary-softer hover:text-ink"
      >
        <Pencil aria-hidden className="size-4" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto w-[min(92vw,440px)] rounded-[var(--radius-card)] border border-line bg-white p-0 shadow-[var(--shadow-pop)]"
      >
        <form action={formAction} noValidate className="space-y-4 p-6">
          <input type="hidden" name="classId" value={classId} />
          <h2 id={titleId} className="text-xl font-bold text-ink">
            Ubah Kelas {classLabel}
          </h2>
          <p className="text-[15px] text-ink-muted">Jadwal, rencana materi, dan riwayat mengajar tetap tersimpan di kelas ini.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`grade-${classId}`} label="Tingkat">
              <select id={`grade-${classId}`} name="gradeLevel" defaultValue={valueOf(state, "gradeLevel", String(gradeLevel))} className={inputClass}>
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    Kelas {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`section-${classId}`} label="Rombel" error={err("section")}>
              <TextInput
                id={`section-${classId}`}
                name="section"
                maxLength={2}
                className="uppercase"
                defaultValue={valueOf(state, "section", section)}
                error={err("section")}
              />
            </Field>
          </div>
          <FormMessage state={state} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              Batal
            </Button>
            <SubmitButton>Simpan</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
