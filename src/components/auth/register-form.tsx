"use client";

import { MailCheck } from "lucide-react";
import { useActionState, useState, type FormEvent } from "react";
import { signUpAction } from "@/app/(auth)/actions";
import { ButtonLink } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE_STATE, valueOf } from "@/lib/validation/action-state";
import { registerSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { DemoAuthNote } from "./demo-auth-note";
import { PasswordInput } from "./password-input";

export function RegisterForm({ demo }: { demo: boolean }) {
  const [state, formAction] = useActionState(signUpAction, IDLE_STATE);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const errors = clientErrors ?? (state.status === "error" ? (state.fieldErrors ?? {}) : {});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    const result = registerSchema.safeParse({
      displayName: String(form.get("displayName") ?? ""),
      email: String(form.get("email") ?? ""),
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

  if (state.status === "success") {
    return (
      <div role="status" className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-mint-soft p-4 text-mint-strong">
          <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>{state.message}</p>
        </div>
        <ButtonLink href="/login" variant="secondary" className="w-full">
          Ke halaman Masuk
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      <Field id="displayName" label="Nama panggilan" hint="Dipakai untuk sapaan, contoh: Bu Sari." error={errors.displayName}>
        <TextInput id="displayName" autoComplete="nickname" hasHint defaultValue={valueOf(state, "displayName")} error={errors.displayName} />
      </Field>
      <Field id="email" label="Email" error={errors.email}>
        <TextInput id="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@sekolah.sch.id" defaultValue={valueOf(state, "email")} error={errors.email} />
      </Field>
      <Field id="password" label="Kata sandi" hint="Minimal 8 karakter." error={errors.password}>
        <PasswordInput id="password" autoComplete="new-password" hasHint error={errors.password} />
      </Field>
      <Field id="confirmPassword" label="Ulangi kata sandi" error={errors.confirmPassword}>
        <PasswordInput id="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Mendaftarkan…">
        Daftar &amp; Mulai Atur Kelas
      </SubmitButton>
      {demo ? (
        <DemoAuthNote>Mode demo: akun belum benar-benar dibuat. Data form tidak dikirim.</DemoAuthNote>
      ) : null}
    </form>
  );
}
