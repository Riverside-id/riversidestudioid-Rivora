"use client";

import { useActionState } from "react";
import { updateSemesterAction } from "@/app/(app)/pengaturan/actions";
import { Field, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";

export function SemesterDatesForm({
  semesterId,
  title,
  isActive,
  startDate,
  endDate,
  midtermDate,
  midtermTerm,
}: {
  semesterId: string;
  title: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  midtermDate: string | null;
  midtermTerm: string;
}) {
  const [state, formAction] = useActionState(updateSemesterAction, IDLE_STATE);
  const id = (name: string) => `${name}-${semesterId}`;

  return (
    <form action={formAction} noValidate className="space-y-3 rounded-2xl border border-line p-4">
      <input type="hidden" name="semesterId" value={semesterId} />
      <p className="font-semibold text-ink">
        {title}
        {isActive ? (
          <span className="ml-2 rounded-full bg-mint-soft px-2.5 py-0.5 text-xs font-semibold text-mint-strong">aktif</span>
        ) : null}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={id("startDate")} label="Mulai" error={fieldError(state, "startDate")}>
          <TextInput id={id("startDate")} name="startDate" type="date" defaultValue={valueOf(state, "startDate", startDate)} error={fieldError(state, "startDate")} />
        </Field>
        <Field id={id("endDate")} label="Selesai" error={fieldError(state, "endDate")}>
          <TextInput id={id("endDate")} name="endDate" type="date" defaultValue={valueOf(state, "endDate", endDate)} error={fieldError(state, "endDate")} />
        </Field>
        <Field id={id("midtermDate")} label={midtermTerm} optional error={fieldError(state, "midtermDate")}>
          <TextInput
            id={id("midtermDate")}
            name="midtermDate"
            type="date"
            defaultValue={valueOf(state, "midtermDate", midtermDate ?? "")}
            error={fieldError(state, "midtermDate")}
          />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton size="sm">Simpan Tanggal</SubmitButton>
    </form>
  );
}
