"use client";

import { ArrowDown, ArrowUp, Download, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteLessonPlanAction, moveLessonPlanAction } from "@/app/(app)/progres/actions";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FormMessage } from "@/components/ui/form-message";
import { midtermSegmentLabel } from "@/lib/domain/labels";
import { isMaterialFileKind, opensInBrowser } from "@/lib/materials/file-rules";
import type { MaterialOption, PlanItem } from "@/lib/services/class-plan";
import { IDLE_STATE } from "@/lib/validation/action-state";
import { cn } from "@/lib/utils";
import { LessonPlanForm } from "./lesson-plan-form";

const iconButton =
  "grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-primary-softer hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

/** Satu topik rencana: nomor urut, progres topik, file materi, dan aksi urutkan/ubah/hapus. */
export function LessonPlanItem({
  plan,
  index,
  isFirst,
  isLast,
  canEdit,
  materials,
  midtermTerm,
}: {
  plan: PlanItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
  materials: MaterialOption[];
  midtermTerm: string;
}) {
  const [editing, setEditing] = useState(false);
  const [moveState, moveAction, moving] = useActionState(moveLessonPlanAction, IDLE_STATE);
  const done = plan.completedSessions >= plan.plannedSessions;
  const fileKind = plan.materialKind && isMaterialFileKind(plan.materialKind) ? plan.materialKind : null;

  if (editing) {
    return (
      <li className="rounded-2xl border border-primary/30 bg-primary-softer/60 p-4">
        <p className="mb-3 font-semibold text-ink">Ubah topik {index + 1}</p>
        <LessonPlanForm
          mode="edit"
          planId={plan.id}
          initial={plan}
          materials={materials}
          midtermTerm={midtermTerm}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-line p-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold",
            done ? "bg-mint-soft text-mint-strong" : "bg-primary-softer text-ink-muted",
          )}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words text-ink">{plan.title}</p>
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink tabular-nums">
              {plan.completedSessions}/{plan.plannedSessions}
            </span>{" "}
            pertemuan selesai
            {plan.midtermSegment ? ` · ${midtermSegmentLabel(plan.midtermSegment, midtermTerm)}` : ""}
          </p>
          {plan.materialId && plan.materialTitle ? (
            fileKind ? (
              <a
                href={`/materi/${plan.materialId}/berkas`}
                target={opensInBrowser(fileKind) ? "_blank" : undefined}
                rel={opensInBrowser(fileKind) ? "noopener noreferrer" : undefined}
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
              >
                {opensInBrowser(fileKind) ? <ExternalLink aria-hidden className="size-4" /> : <Download aria-hidden className="size-4" />}
                {plan.materialTitle}
              </a>
            ) : (
              <a
                href={`/materi/${plan.materialId}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
              >
                <ExternalLink aria-hidden className="size-4" />
                {plan.materialTitle}
              </a>
            )
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center">
            <form action={moveAction}>
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" className={iconButton} disabled={isFirst || moving} aria-label={`Naikkan ${plan.title}`}>
                <ArrowUp aria-hidden className="size-4" />
              </button>
            </form>
            <form action={moveAction}>
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" className={iconButton} disabled={isLast || moving} aria-label={`Turunkan ${plan.title}`}>
                <ArrowDown aria-hidden className="size-4" />
              </button>
            </form>
            <button type="button" className={iconButton} onClick={() => setEditing(true)} aria-label={`Ubah ${plan.title}`}>
              <Pencil aria-hidden className="size-4" />
            </button>
            {plan.hasRecords ? null : (
              <ConfirmAction
                trigger={<Trash2 aria-hidden className="size-4" />}
                triggerLabel={`Hapus topik ${plan.title}`}
                triggerClassName={cn(iconButton, "hover:bg-rose-soft hover:text-rose-strong")}
                title="Hapus topik ini?"
                description={
                  <>
                    Topik <strong>{plan.title}</strong> dihapus dari rencana. Topik ini belum pernah dipakai di catatan
                    pertemuan, jadi tidak ada riwayat yang hilang.
                  </>
                }
                confirmLabel="Hapus Topik"
                action={deleteLessonPlanAction}
                fields={{ planId: plan.id }}
              />
            )}
          </div>
        ) : null}
      </div>
      {moveState.status === "error" ? <FormMessage state={moveState} className="mt-2" /> : null}
    </li>
  );
}
