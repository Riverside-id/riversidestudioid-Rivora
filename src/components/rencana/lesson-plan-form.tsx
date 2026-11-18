"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createLessonPlanAction, updateLessonPlanAction } from "@/app/(app)/progres/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { MATERIAL_KIND_LABEL } from "@/lib/domain/labels";
import type { MidtermSegment } from "@/lib/domain/types";
import type { MaterialOption } from "@/lib/services/class-plan";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";

type Values = { title: string; plannedSessions: number; midtermSegment: MidtermSegment | null; materialId: string | null };

/** Form tambah/ubah topik rencana materi (F06). Satu file Bank Materi bisa dipakai banyak kelas. */
export function LessonPlanForm({
  mode,
  classId,
  planId,
  initial,
  materials,
  midtermTerm,
  onDone,
}: {
  mode: "create" | "edit";
  classId?: string;
  planId?: string;
  initial?: Values;
  materials: MaterialOption[];
  midtermTerm: string;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(mode === "create" ? createLessonPlanAction : updateLessonPlanAction, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.status === "success" && mode === "edit") onDone?.();
  }
  useEffect(() => {
    if (state.status === "success" && mode === "create") formRef.current?.reset();
  }, [state, mode]);

  const id = (name: string) => `${mode}-${planId ?? classId}-${name}`;
  const err = (field: string) => fieldError(state, field);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-3">
      {classId ? <input type="hidden" name="classId" value={classId} /> : null}
      {planId ? <input type="hidden" name="planId" value={planId} /> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field id={id("title")} label="Judul topik" error={err("title")}>
          <TextInput
            id={id("title")}
            name="title"
            maxLength={120}
            placeholder="Contoh: Penjumlahan Sederhana"
            defaultValue={valueOf(state, "title", initial?.title)}
            error={err("title")}
          />
        </Field>
        <Field id={id("sessions")} label="Jumlah pertemuan" error={err("plannedSessions")}>
          <TextInput
            id={id("sessions")}
            name="plannedSessions"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            defaultValue={valueOf(state, "plannedSessions", String(initial?.plannedSessions ?? 2))}
            error={err("plannedSessions")}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={id("segment")} label={`Penanda ${midtermTerm}`} optional>
          <select id={id("segment")} name="midtermSegment" defaultValue={valueOf(state, "midtermSegment", initial?.midtermSegment ?? "")} className={inputClass}>
            <option value="">Tanpa penanda</option>
            <option value="before">Sebelum {midtermTerm}</option>
            <option value="after">Setelah {midtermTerm}</option>
          </select>
        </Field>
        <Field id={id("material")} label="File dari Bank Materi" optional error={err("materialId")}>
          <select id={id("material")} name="materialId" defaultValue={valueOf(state, "materialId", initial?.materialId ?? "")} className={inputClass}>
            <option value="">Tanpa file</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({MATERIAL_KIND_LABEL[m.kind]})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton size="sm">{mode === "create" ? "Tambah Topik" : "Simpan Perubahan"}</SubmitButton>
        {onDone ? (
          <Button variant="ghost" size="sm" onClick={onDone}>
            Batal
          </Button>
        ) : null}
      </div>
    </form>
  );
}
