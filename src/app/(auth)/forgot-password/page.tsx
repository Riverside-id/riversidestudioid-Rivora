import type { Metadata } from "next";
import { isDemoMode } from "@/lib/data";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Lupa Kata Sandi" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">Lupa kata sandi?</h1>
      <p className="mt-2 mb-8 text-lg text-ink-muted">
        Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.
      </p>
      <ForgotPasswordForm demo={isDemoMode()} />
      <p className="mt-8 text-center text-[15px] text-ink-muted">
        Ingat kata sandi?{" "}
        <Link href="/login" className="font-semibold text-primary-strong hover:underline">
          Masuk
        </Link>
      </p>
    </>
  );
}
