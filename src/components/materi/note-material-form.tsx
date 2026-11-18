"use client";

import { useActionState, useEffect, useRef } from "react";
import { createNoteMaterialAction } from "@/app/(app)/materi/actions";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";
import { MaterialMetaFields } from "./material-meta-fields";

/** Catatan teks sederhana (tanpa editor rumit). */
export function NoteMaterialForm() {
  const [state, formAction] = useActionState(createNoteMaterialAction, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      <Field id="note-title" label="Judul catatan" error={fieldError(state, "title")}>
        <TextInput id="note-title" name="title" maxLength={120} placeholder="Contoh: Langkah mengajar Pecahan" defaultValue={valueOf(state, "title")} error={fieldError(state, "title")} />
      </Field>
      <Field id="note-body" label="Isi catatan" error={fieldError(state, "body")}>
        <textarea
          id="note-body"
          name="body"
          rows={8}
          maxLength={20000}
          defaultValue={valueOf(state, "body")}
          placeholder={"Contoh:\n1. Apersepsi dengan potongan kue\n2. Latihan kelompok\n3. Refleksi"}
          aria-invalid={fieldError(state, "body") ? true : undefined}
          className={cn(inputClass, "h-auto py-3")}
        />
      </Field>
      <MaterialMetaFields state={state} prefix="note" withDescription={false} />
      <FormMessage state={state} />
      <SubmitButton size="sm">Simpan Catatan</SubmitButton>
    </form>
  );
}
