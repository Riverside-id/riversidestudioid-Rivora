"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { TextInput } from "@/components/ui/field";

export function PasswordInput(props: ComponentProps<typeof TextInput>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextInput {...props} type={visible ? "text" : "password"} className="pr-14" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-primary-softer hover:text-ink"
        aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
      </button>
    </div>
  );
}
