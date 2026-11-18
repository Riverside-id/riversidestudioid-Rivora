"use client";

import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

/** Tombol kirim dengan status memproses (mencegah klik ganda). */
export function SubmitButton({
  children,
  pendingLabel = "Menyimpan…",
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingLabel?: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
