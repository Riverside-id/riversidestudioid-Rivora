import { CircleAlert, CircleCheck } from "lucide-react";
import type { ActionState } from "@/lib/validation/action-state";
import { cn } from "@/lib/utils";

/** Pesan hasil aksi (berhasil/gagal) — diumumkan ke pembaca layar. */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle") return null;
  if (state.status === "error" && !state.message) return null;
  const success = state.status === "success";
  const Icon = success ? CircleCheck : CircleAlert;
  return (
    <p
      role={success ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[15px]",
        success ? "bg-mint-soft text-mint-strong" : "bg-rose-soft text-rose-strong",
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{state.message}</span>
    </p>
  );
}
