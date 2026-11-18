"use client";

import { useActionState, useEffect, useRef } from "react";
import { createClassAction } from "@/app/(app)/jadwal/actions";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";

export function AddClassForm() {
  const [state, formAction] = useActionState(createClassAction, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-3 pr-8">
      <p className="font-semibold text-ink">Tambah kelas</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="gradeLevel" label="Tingkat">
          <select id="gradeLevel" name="gradeLevel" defaultValue={valueOf(state, "gradeLevel", "1")} className={inputClass}>
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                Kelas {g}
              </option>
            ))}
          </select>
        </Field>
        <Field id="section" label="Rombel" error={fieldError(state, "section")}>
          <TextInput id="section" maxLength={2} placeholder="A" className="uppercase" defaultValue={valueOf(state, "section")} error={fieldError(state, "section")} />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton size="sm">Simpan Kelas</SubmitButton>
    </form>
  );
}
