import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = { title: "Buat Kata Sandi Baru" };

/** Dibuka dari tautan email pemulihan (sesi dibuat oleh /auth/confirm). */
export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">Buat kata sandi baru</h1>
      <p className="mt-2 mb-8 text-lg text-ink-muted">Masukkan kata sandi baru untuk akun Rivora Anda.</p>
      <NewPasswordForm afterSuccessHref="/dashboard" />
    </>
  );
}
