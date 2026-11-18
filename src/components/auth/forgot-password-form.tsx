"use client";

import { MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { DemoAuthNote } from "./demo-auth-note";

export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = forgotPasswordSchema.safeParse({ email: String(form.get("email") ?? "") });
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error));
      return;
    }
    setErrors({});
    setSent(true);
  }

  if (sent) {
    return (
      <div role="status" className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-mint-soft p-4 text-mint-strong">
          <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>
            Jika email tersebut terdaftar, tautan untuk membuat kata sandi baru akan dikirim. Periksa juga
            folder spam.
          </p>
        </div>
        <DemoAuthNote>Mode demo: tidak ada email yang benar-benar dikirim.</DemoAuthNote>
        <ButtonLink href="/login" variant="secondary" className="w-full">
          Kembali ke halaman Masuk
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="email" label="Email" error={errors.email}>
        <TextInput id="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@sekolah.sch.id" error={errors.email} />
      </Field>
      <Button type="submit" size="lg" className="w-full">
        Kirim Tautan Reset
      </Button>
    </form>
  );
}
