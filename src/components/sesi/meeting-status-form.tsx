"use client";

import { CalendarClock, CircleCheck, CircleSlash, RotateCcw } from "lucide-react";
import { useActionState, useState } from "react";
import { saveMeetingAction } from "@/app/(app)/jadwal/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { midtermSegmentLabel } from "@/lib/domain/labels";
import type { ISODate, MeetingStatus } from "@/lib/domain/types";
import type { PlanOption } from "@/lib/services/session-detail";
import { fieldError, IDLE_STATE, valueOf } from "@/lib/validation/action-state";
import { cn } from "@/lib/utils";

type Choice = Exclude<MeetingStatus, "scheduled"> | "scheduled";

const CHOICES: { status: Exclude<MeetingStatus, "scheduled">; label: string; Icon: typeof CircleCheck; variant: "primary" | "secondary" | "ghost" }[] = [
  { status: "completed", label: "Tandai Selesai", Icon: CircleCheck, variant: "primary" },
  { status: "postponed", label: "Tunda", Icon: CalendarClock, variant: "secondary" },
  { status: "cancelled", label: "Batal", Icon: CircleSlash, variant: "ghost" },
];

const SUBMIT_LABEL: Record<Choice, string> = {
  completed: "Simpan sebagai Selesai",
  postponed: "Simpan sebagai Ditunda",
  cancelled: "Simpan sebagai Batal",
  scheduled: "Kembalikan ke Terjadwal",
};

/**
 * Pencatatan pelaksanaan satu pertemuan (F07). Status hanya berubah karena tindakan guru —
 * tidak pernah otomatis karena tanggal lewat.
 */
export function MeetingStatusForm({
  sessionId,
  sessionDate,
  currentStatus,
  plans,
  defaultPlanId,
  defaultSummary,
  defaultNotes,
  canCreateReplacement,
}: {
  sessionId: string;
  sessionDate: ISODate;
  currentStatus: MeetingStatus;
  plans: PlanOption[];
  defaultPlanId: string | null;
  defaultSummary: string | null;
  defaultNotes: string | null;
  canCreateReplacement: boolean;
}) {
  const [state, formAction] = useActionState(saveMeetingAction, IDLE_STATE);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [withReplacement, setWithReplacement] = useState(false);

  // Tutup form setelah berhasil (penyesuaian state saat render, tanpa efek).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") {
      setChoice(null);
      setWithReplacement(false);
    }
  }

  const err = (field: string) => fieldError(state, field);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {CHOICES.map(({ status, label, Icon, variant }) => (
          <Button
            key={status}
            variant={choice === status ? "primary" : choice !== null && variant === "primary" ? "secondary" : variant}
            aria-pressed={choice === status}
            onClick={() => setChoice(choice === status ? null : status)}
          >
            <Icon aria-hidden className="size-5" /> {currentStatus === status ? `${label} (ubah catatan)` : label}
          </Button>
        ))}
        {currentStatus !== "scheduled" ? (
          <Button variant="ghost" aria-pressed={choice === "scheduled"} onClick={() => setChoice(choice === "scheduled" ? null : "scheduled")}>
            <RotateCcw aria-hidden className="size-5" /> Kembalikan ke Terjadwal
          </Button>
        ) : null}
      </div>

      {choice === null ? <FormMessage state={state} /> : null}

      {choice ? (
        <form action={formAction} noValidate className="space-y-4 rounded-2xl border border-primary/30 bg-primary-softer/60 p-4">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="status" value={choice} />

          {choice === "completed" ? (
            <>
              <Field id="lessonPlanId" label="Materi yang diajarkan" error={err("lessonPlanId")}>
                <select
                  id="lessonPlanId"
                  name="lessonPlanId"
                  defaultValue={valueOf(state, "lessonPlanId", defaultPlanId ?? "")}
                  className={inputClass}
                >
                  <option value="">Tanpa topik rencana</option>
                  {plans.map((p, i) => (
                    <option key={p.id} value={p.id}>
                      {i + 1}. {p.title} ({p.completedSessions}/{p.plannedSessions} selesai
                      {p.midtermSegment ? ` · ${midtermSegmentLabel(p.midtermSegment)}` : ""})
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="actualDate" label="Tanggal pelaksanaan" error={err("actualDate")}>
                <TextInput id="actualDate" type="date" defaultValue={valueOf(state, "actualDate", sessionDate)} error={err("actualDate")} />
              </Field>
              <Field id="summary" label="Ringkasan pembelajaran" optional error={err("summary")}>
                <textarea
                  id="summary"
                  name="summary"
                  rows={3}
                  maxLength={1000}
                  defaultValue={valueOf(state, "summary", defaultSummary ?? "")}
                  placeholder="Contoh: Membilang 1–10 dengan stik es krim."
                  className={cn(inputClass, "h-auto py-3")}
                />
              </Field>
            </>
          ) : (
            <input type="hidden" name="lessonPlanId" value={defaultPlanId ?? ""} />
          )}

          {choice !== "scheduled" ? (
            <Field
              id="notes"
              label={choice === "completed" ? "Kendala atau catatan tambahan" : "Alasan"}
              optional
              error={err("notes")}
            >
              <textarea
                id="notes"
                name="notes"
                rows={2}
                maxLength={1000}
                defaultValue={valueOf(state, "notes", defaultNotes ?? "")}
                placeholder={choice === "completed" ? "Contoh: Dua siswa perlu latihan tambahan." : "Contoh: Libur nasional / rapat guru."}
                className={cn(inputClass, "h-auto py-3")}
              />
            </Field>
          ) : null}

          {choice === "postponed" && canCreateReplacement ? (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-[15px] font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={withReplacement}
                  onChange={(e) => setWithReplacement(e.target.checked)}
                  className="size-5 accent-primary"
                />
                Buat jadwal pengganti
              </label>
              {withReplacement ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field id="replacementDate" label="Tanggal" error={err("replacementDate")}>
                    <TextInput id="replacementDate" type="date" defaultValue={valueOf(state, "replacementDate")} error={err("replacementDate")} />
                  </Field>
                  <Field id="replacementStart" label="Jam mulai" error={err("replacementStart")}>
                    <TextInput id="replacementStart" type="time" defaultValue={valueOf(state, "replacementStart")} error={err("replacementStart")} />
                  </Field>
                  <Field id="replacementEnd" label="Jam selesai" error={err("replacementEnd")}>
                    <TextInput id="replacementEnd" type="time" defaultValue={valueOf(state, "replacementEnd")} error={err("replacementEnd")} />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : null}

          {choice === "scheduled" ? (
            <p className="text-[15px] text-ink-muted">
              Status kembali ke Terjadwal. Bila sebelumnya Selesai, progres kelas ikut dikoreksi. Riwayat perubahan tetap tercatat.
            </p>
          ) : null}

          <FormMessage state={state} />
          <div className="flex flex-wrap gap-3">
            <SubmitButton>{SUBMIT_LABEL[choice]}</SubmitButton>
            <Button variant="ghost" onClick={() => setChoice(null)}>
              Tutup
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
