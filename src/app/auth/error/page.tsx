import { LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tautan Tidak Berlaku" };

export default function AuthLinkErrorPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo href="/" withTagline />
        </div>
        <div className="card p-8 text-center">
          <span aria-hidden className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-soft text-amber-strong">
            <LinkIcon className="size-7" />
          </span>
          <h1 className="text-2xl font-bold text-ink">Tautan sudah tidak berlaku</h1>
          <p className="mt-2 text-ink-muted">
            Tautan di email mungkin sudah kedaluwarsa (berlaku 1 jam) atau pernah dipakai. Minta tautan baru,
            lalu buka dari email terbaru.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/login">Ke halaman Masuk</ButtonLink>
            <ButtonLink href="/forgot-password" variant="secondary">
              Minta tautan reset
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
