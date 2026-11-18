"use client";

import { useActionState } from "react";
import { createScheduleAction } from "@/app/(app)/jadwal/actions";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { WEEKDAY_LABEL } from "@/lib/domain/labels";
import type { Weekday } from "@/lib/domain/types";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6];

export function AddScheduleForm({
  classes,
  semesterLabel,
}: {
  classes: Array<{ id: string; label: string }>;
  semesterLabel: string;
}) {
  const [state, formAction] = useActionState(createScheduleAction, IDLE_STATE);

  if (classes.length === 0) {
    return <p className="pr-8 text-[15px] text-ink-muted">Tambahkan kelas terlebih dahulu di bagian Kelola Kelas.</p>;
  }

  return (
    <form action={formAction} noValidate className="space-y-3 pr-8">
      <div>
        <p className="font-semibold text-ink">Tambah jadwal rutin</p>
        <p className="text-sm text-ink-muted">Berlaku sepanjang {semesterLabel}.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="classId" label="Kelas" error={fieldError(state, "classId")}>
          <select id="classId" name="classId" className={inputClass} defaultValue={valueOf(state, "classId", classes[0].id)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Kelas {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="weekday" label="Hari" error={fieldError(state, "weekday")}>
          <select id="weekday" name="weekday" className={inputClass} defaultValue={valueOf(state, "weekday", "1")}>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {WEEKDAY_LABEL[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="startTime" label="Jam mulai" error={fieldError(state, "startTime")}>
          <TextInput id="startTime" type="time" defaultValue={valueOf(state, "startTime", "07:30")} error={fieldError(state, "startTime")} />
        </Field>
        <Field id="endTime" label="Jam selesai" error={fieldError(state, "endTime")}>
          <TextInput id="endTime" type="time" defaultValue={valueOf(state, "endTime", "08:40")} error={fieldError(state, "endTime")} />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton size="sm">Simpan Jadwal</SubmitButton>
    </form>
  );
}
