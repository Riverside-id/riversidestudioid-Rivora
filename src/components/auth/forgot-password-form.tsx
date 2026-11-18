"use client";

import { MailCheck } from "lucide-react";
import { useActionState, useState, type FormEvent } from "react";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { ButtonLink } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE_STATE, valueOf } from "@/lib/validation/action-state";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { DemoAuthNote } from "./demo-auth-note";

export function ForgotPasswordForm({ demo }: { demo: boolean }) {
  const [state, formAction] = useActionState(forgotPasswordAction, IDLE_STATE);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const errors = clientErrors ?? (state.status === "error" ? (state.fieldErrors ?? {}) : {});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const result = forgotPasswordSchema.safeParse({ email: String(new FormData(e.currentTarget).get("email") ?? "") });
    if (!result.success) {
      e.preventDefault();
      setClientErrors(issuesToFieldErrors(result.error));
      return;
    }
    setClientErrors(null);
  }

  if (state.status === "success") {
    return (
      <div role="status" className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-mint-soft p-4 text-mint-strong">
          <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>{state.message}</p>
        </div>
        {demo ? <DemoAuthNote>Mode demo: tidak ada email yang benar-benar dikirim.</DemoAuthNote> : null}
        <ButtonLink href="/login" variant="secondary" className="w-full">
          Kembali ke halaman Masuk
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      <Field id="email" label="Email" error={errors.email}>
        <TextInput id="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@sekolah.sch.id" defaultValue={valueOf(state, "email")} error={errors.email} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Mengirim…">
        Kirim Tautan Reset
      </SubmitButton>
    </form>
  );
}
