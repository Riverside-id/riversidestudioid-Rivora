"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <span aria-hidden className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-rose-soft text-rose-strong">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="text-2xl font-bold text-ink">Halaman belum bisa dimuat</h1>
      <p className="mt-2 text-ink-muted">
        Periksa koneksi internet Anda, lalu coba lagi. Data Anda tidak berubah.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-ink-subtle">Kode: {error.digest}</p> : null}
      <Button className="mt-6" onClick={reset}>
        <RotateCcw aria-hidden className="size-5" /> Coba Lagi
      </Button>
    </div>
  );
}
