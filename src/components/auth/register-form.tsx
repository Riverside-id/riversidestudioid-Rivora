"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { registerSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { DemoAuthNote } from "./demo-auth-note";
import { PasswordInput } from "./password-input";

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = registerSchema.safeParse({
      displayName: String(form.get("displayName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
    });
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error));
      return;
    }
    setErrors({});
    router.push("/onboarding");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="displayName" label="Nama panggilan" hint="Dipakai untuk sapaan, contoh: Bu Sari." error={errors.displayName}>
        <TextInput id="displayName" autoComplete="nickname" hasHint error={errors.displayName} />
      </Field>
      <Field id="email" label="Email" error={errors.email}>
        <TextInput id="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@sekolah.sch.id" error={errors.email} />
      </Field>
      <Field id="password" label="Kata sandi" hint="Minimal 8 karakter." error={errors.password}>
        <PasswordInput id="password" autoComplete="new-password" hasHint error={errors.password} />
      </Field>
      <Field id="confirmPassword" label="Ulangi kata sandi" error={errors.confirmPassword}>
        <PasswordInput id="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} />
      </Field>
      <Button type="submit" size="lg" className="w-full">
        Daftar &amp; Mulai Atur Kelas
      </Button>
      <DemoAuthNote>
        Mode demo: akun belum benar-benar dibuat (Supabase Auth di Fase B). Data form tidak dikirim.
      </DemoAuthNote>
    </form>
  );
}
