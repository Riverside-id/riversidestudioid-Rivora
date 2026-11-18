"use client";

import { useActionState, useEffect, useRef } from "react";
import { createLinkMaterialAction } from "@/app/(app)/materi/actions";
import { Field, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";
import { MaterialMetaFields } from "./material-meta-fields";

/** Tautan video pembelajaran atau referensi (hanya http/https; dibuka di tab baru). */
export function LinkMaterialForm() {
  const [state, formAction] = useActionState(createLinkMaterialAction, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);
  const kind = valueOf(state, "kind", "video");

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-2 text-[15px] font-semibold text-ink">Jenis tautan</legend>
        <label className="flex items-center gap-2 text-[15px] text-ink">
          <input type="radio" name="kind" value="video" defaultChecked={kind === "video"} className="size-5 accent-primary" /> Video pembelajaran
        </label>
        <label className="flex items-center gap-2 text-[15px] text-ink">
          <input type="radio" name="kind" value="link" defaultChecked={kind === "link"} className="size-5 accent-primary" /> Referensi / situs
        </label>
      </fieldset>
      <Field id="link-url" label="Alamat tautan" error={fieldError(state, "url")} hint="Contoh: https://www.youtube.com/watch?v=…">
        <TextInput id="link-url" name="url" type="url" inputMode="url" autoComplete="off" placeholder="https://" defaultValue={valueOf(state, "url")} error={fieldError(state, "url")} hasHint />
      </Field>
      <Field id="link-title" label="Judul materi" error={fieldError(state, "title")}>
        <TextInput id="link-title" name="title" maxLength={120} placeholder="Contoh: Video Pecahan Senilai" defaultValue={valueOf(state, "title")} error={fieldError(state, "title")} />
      </Field>
      <MaterialMetaFields state={state} prefix="link" />
      <FormMessage state={state} />
      <SubmitButton size="sm">Simpan Tautan</SubmitButton>
    </form>
  );
}
