import type { Metadata } from "next";
import { isDemoMode } from "@/lib/data";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">Selamat datang kembali</h1>
      <p className="mt-2 mb-8 text-lg text-ink-muted">Masuk untuk melihat jadwal mengajar hari ini.</p>
      <LoginForm demo={isDemoMode()} />
      <p className="mt-8 text-center text-[15px] text-ink-muted">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-primary-strong hover:underline">
          Daftar sebagai guru
        </Link>
      </p>
    </>
  );
}
