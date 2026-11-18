"use client";

import { Printer } from "lucide-react";
import { Button } from "./button";

/** Membuka dialog cetak browser; pilih "Simpan sebagai PDF" untuk menyimpan laporan sebagai PDF. */
export function PrintButton({ label = "Cetak / Simpan PDF" }: { label?: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()}>
      <Printer aria-hidden className="size-4" /> {label}
    </Button>
  );
}
