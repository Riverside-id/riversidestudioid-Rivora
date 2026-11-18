import type { Metadata } from "next";
import { isDemoMode } from "@/lib/data";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">Buat akun guru</h1>
      <p className="mt-2 mb-8 text-lg text-ink-muted">Satu akun untuk semua kelas Matematika Anda.</p>
      <RegisterForm demo={isDemoMode()} />
      <p className="mt-8 text-center text-[15px] text-ink-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary-strong hover:underline">
          Masuk
        </Link>
      </p>
    </>
  );
}
