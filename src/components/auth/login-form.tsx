"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { loginSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { DemoAuthNote } from "./demo-auth-note";
import { PasswordInput } from "./password-input";

/**
 * Fase A: validasi di browser saja, TIDAK mengirim data ke mana pun.
 * Fase B: diganti Server Action + Supabase Auth (validasi ulang di server).
 */
export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = loginSchema.safeParse({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error));
      return;
    }
    setErrors({});
    router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="email" label="Email" error={errors.email}>
        <TextInput id="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@sekolah.sch.id" error={errors.email} />
      </Field>
      <Field id="password" label="Kata sandi" error={errors.password}>
        <PasswordInput id="password" autoComplete="current-password" error={errors.password} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-[15px] font-semibold text-primary-strong hover:underline">
          Lupa kata sandi?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full">
        Masuk
      </Button>
      <DemoAuthNote>
        Mode demo: login Supabase belum aktif (Fase B). Data form tidak dikirim; tombol Masuk membuka
        beranda berisi data contoh.
      </DemoAuthNote>
    </form>
  );
}
