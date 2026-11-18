"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/(app)/pengaturan/actions";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";
import { TIMEZONE_OPTIONS } from "@/lib/validation/settings";

export function ProfileForm({
  displayName,
  schoolName,
  timezone,
}: {
  displayName: string;
  schoolName: string | null;
  timezone: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, IDLE_STATE);
  return (
    <form action={formAction} noValidate className="space-y-4">
      <Field id="displayName" label="Nama panggilan" hint="Tampil di sapaan Beranda." error={fieldError(state, "displayName")}>
        <TextInput id="displayName" defaultValue={valueOf(state, "displayName", displayName)} autoComplete="nickname" hasHint error={fieldError(state, "displayName")} />
      </Field>
      <Field id="schoolName" label="Nama sekolah" optional error={fieldError(state, "schoolName")}>
        <TextInput id="schoolName" defaultValue={valueOf(state, "schoolName", schoolName ?? "")} autoComplete="organization" error={fieldError(state, "schoolName")} />
      </Field>
      <Field id="timezone" label="Zona waktu" hint="Menentukan “hari ini” untuk jadwal." error={fieldError(state, "timezone")}>
        <select id="timezone" name="timezone" defaultValue={valueOf(state, "timezone", timezone)} aria-describedby="timezone-hint" className={inputClass}>
          {TIMEZONE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <FormMessage state={state} />
      <SubmitButton>Simpan Profil</SubmitButton>
    </form>
  );
}
