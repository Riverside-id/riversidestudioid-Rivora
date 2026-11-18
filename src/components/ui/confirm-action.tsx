"use client";

import { useActionState, useEffect, useId, useRef, type ReactNode } from "react";
import { IDLE_STATE, type ActionState } from "@/lib/validation/action-state";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

/**
 * Tombol + dialog konfirmasi (PRD §8: konfirmasi untuk hapus/arsip). Memakai <dialog> native:
 * fokus terkunci, Esc menutup. Aksi dijalankan lewat Server Action.
 */
export function ConfirmAction({
  trigger,
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
  action,
  fields,
  tone = "danger",
}: {
  trigger: ReactNode;
  /** Label aksesibel untuk tombol pemicu (mis. "Hapus jadwal Kelas 1A Senin"). */
  triggerLabel: string;
  triggerClassName?: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  tone?: "danger" | "primary";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, formAction] = useActionState(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state]);

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto w-[min(92vw,440px)] rounded-[var(--radius-card)] border border-line bg-white p-0 shadow-[var(--shadow-pop)]"
      >
        <form action={formAction} className="p-6">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id={titleId} className="text-xl font-bold text-ink">
            {title}
          </h2>
          <div className="mt-2 text-[15px] text-ink-muted">{description}</div>
          <FormMessage state={state} className="mt-4" />
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              Batal
            </Button>
            <SubmitButton
              pendingLabel="Memproses…"
              className={cn(tone === "danger" && "bg-rose-strong shadow-none hover:bg-[#8f0f30]")}
            >
              {confirmLabel}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
