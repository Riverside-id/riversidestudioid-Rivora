"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { IDLE_STATE, type ActionState } from "@/lib/validation/action-state";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

/** Tombol satu aksi (mis. Pulihkan) lewat Server Action, dengan pesan gagal di bawahnya. */
export function ActionButton({
  action,
  fields,
  children,
  pendingLabel = "Memproses…",
  label,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  children: ReactNode;
  pendingLabel?: string;
  /** Label aksesibel bila isi tombol kurang jelas di luar konteks. */
  label?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  return (
    <form action={formAction} className="contents">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant="secondary" size="sm" pendingLabel={pendingLabel} aria-label={label}>
        {children}
      </SubmitButton>
      {state.status === "error" ? <FormMessage state={state} className="basis-full" /> : null}
    </form>
  );
}
