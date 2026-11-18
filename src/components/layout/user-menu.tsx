"use client";

import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { initialsOf } from "@/lib/domain/labels";

export function UserMenu({ displayName, schoolName }: { displayName: string; schoolName: string | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex h-12 items-center gap-3 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-white/80"
      >
        <span
          aria-hidden
          className="grid size-11 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-[#ffe3cf] to-[#f6c9a8] text-base font-bold text-[#7a4a2c] shadow-[var(--shadow-card)]"
        >
          {initialsOf(displayName)}
        </span>
        <span className="hidden text-[17px] font-semibold whitespace-nowrap text-ink sm:inline">{displayName}</span>
        <span className="sr-only sm:hidden">{displayName}, buka menu akun</span>
        <ChevronDown aria-hidden className="size-4 text-ink-muted" />
      </button>

      {open ? (
        <div
          id={menuId}
          className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-line bg-white p-2 shadow-[var(--shadow-pop)]"
        >
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="font-semibold text-ink">{displayName}</p>
            <p className="text-sm text-ink-muted">{schoolName ?? "Guru Matematika SD"}</p>
          </div>
          <ul className="pt-1">
            <li>
              <Link
                href="/pengaturan"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] text-ink hover:bg-primary-softer"
              >
                <Settings aria-hidden className="size-5 text-ink-muted" />
                Pengaturan
              </Link>
            </li>
            <li>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] text-ink hover:bg-primary-softer"
                >
                  <LogOut aria-hidden className="size-5 text-ink-muted" />
                  Keluar
                </button>
              </form>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
