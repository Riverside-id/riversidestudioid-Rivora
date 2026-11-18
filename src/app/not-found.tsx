import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="card max-w-md p-8 text-center">
        <span aria-hidden className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Compass className="size-7" />
        </span>
        <h1 className="text-2xl font-bold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-muted">Alamat yang dibuka tidak ada atau sudah dipindahkan.</p>
        <ButtonLink href="/dashboard" className="mt-6">
          Kembali ke Beranda
        </ButtonLink>
      </div>
    </div>
  );
}
