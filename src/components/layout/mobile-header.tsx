"use client";

import { Menu, X } from "lucide-react";
import { useRef } from "react";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "./sidebar-nav";
import { StudioCard } from "./studio-card";

/**
 * Header ponsel/tablet (< 1024px) dengan laci menu berbasis <dialog> native:
 * fokus terkunci di dalam laci, Esc menutup, latar belakang tidak bisa diklik.
 * Laci ditutup saat tautan menu diklik (onNavigate).
 */
export function MobileHeader() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = () => dialogRef.current?.close();
  const open = () => dialogRef.current?.showModal();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
        <Logo className="[&_svg]:h-8 [&_span>span:first-child]:text-2xl" />
        <button
          type="button"
          onClick={open}
          className="grid size-11 place-items-center rounded-xl text-ink hover:bg-primary-softer"
          aria-label="Buka menu"
          aria-haspopup="dialog"
        >
          <Menu aria-hidden className="size-6" />
        </button>
      </header>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-0 h-dvh max-h-dvh w-[86vw] max-w-[320px] bg-transparent p-0 open:flex"
      >
        <div className="flex h-full w-full flex-col overflow-y-auto overscroll-contain bg-white px-5 pt-5 pb-6 shadow-[var(--shadow-pop)]">
          <div className="mb-8 flex items-center justify-between">
            <Logo className="[&_svg]:h-8 [&_span>span:first-child]:text-2xl" />
            <button
              type="button"
              onClick={close}
              className="grid size-11 place-items-center rounded-xl text-ink hover:bg-primary-softer"
              aria-label="Tutup menu"
            >
              <X aria-hidden className="size-6" />
            </button>
          </div>
          <SidebarNav onNavigate={close} />
          <div className="mt-auto pt-6 [@media(max-height:560px)]:hidden">
            <StudioCard />
          </div>
        </div>
      </dialog>
    </>
  );
}
