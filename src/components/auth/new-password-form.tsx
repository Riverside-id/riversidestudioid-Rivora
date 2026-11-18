"use client";

import { useActionState, useState, type FormEvent } from "react";
import { updatePasswordAction } from "@/app/(auth)/actions";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE_STATE } from "@/lib/validation/action-state";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { newPasswordSchema } from "@/lib/validation/settings";
import { PasswordInput } from "./password-input";

/** Form kata sandi baru — dipakai /reset-password dan Pengaturan. */
export function NewPasswordForm({ afterSuccessHref }: { afterSuccessHref?: string }) {
  const [state, formAction] = useActionState(updatePasswordAction, IDLE_STATE);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const errors = clientErrors ?? (state.status === "error" ? (state.fieldErrors ?? {}) : {});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    const result = newPasswordSchema.safeParse({
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
    });
    if (!result.success) {
      e.preventDefault();
      setClientErrors(issuesToFieldErrors(result.error));
      return;
    }
    setClientErrors(null);
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      <Field id="password" label="Kata sandi baru" hint="Minimal 8 karakter." error={errors.password}>
        <PasswordInput id="password" autoComplete="new-password" hasHint error={errors.password} />
      </Field>
      <Field id="confirmPassword" label="Ulangi kata sandi baru" error={errors.confirmPassword}>
        <PasswordInput id="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Menyimpan…">Simpan Kata Sandi</SubmitButton>
        {state.status === "success" && afterSuccessHref ? (
          <ButtonLink href={afterSuccessHref} variant="secondary">
            Lanjut ke Beranda
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );
}
