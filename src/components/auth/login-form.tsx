"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { signInAction } from "@/app/(auth)/actions";
import { Field, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE_STATE, valueOf } from "@/lib/validation/action-state";
import { loginSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { DemoAuthNote } from "./demo-auth-note";
import { PasswordInput } from "./password-input";

/** Validasi instan di browser + validasi ulang & Supabase Auth di server (Server Action). */
export function LoginForm({ demo }: { demo: boolean }) {
  const [state, formAction] = useActionState(signInAction, IDLE_STATE);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const errors = clientErrors ?? (state.status === "error" ? (state.fieldErrors ?? {}) : {});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    const result = loginSchema.safeParse({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
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
      <Field id="email" label="Email" error={errors.email}>
        <TextInput id="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@sekolah.sch.id" defaultValue={valueOf(state, "email")} error={errors.email} />
      </Field>
      <Field id="password" label="Kata sandi" error={errors.password}>
        <PasswordInput id="password" autoComplete="current-password" error={errors.password} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-[15px] font-semibold text-primary-strong hover:underline">
          Lupa kata sandi?
        </Link>
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Memeriksa…">
        Masuk
      </SubmitButton>
      {demo ? (
        <DemoAuthNote>
          Mode demo: login belum memeriksa akun. Data form tidak dikirim; tombol Masuk membuka beranda berisi
          data contoh.
        </DemoAuthNote>
      ) : null}
    </form>
  );
}
