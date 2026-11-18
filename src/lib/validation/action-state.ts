/** Hasil Server Action yang dipakai form (useActionState). Aman dipakai di client & server. */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message?: string;
      fieldErrors?: Record<string, string>;
      /** Isian yang dikirim, agar form tidak kosong setelah gagal (kata sandi tidak pernah dikembalikan). */
      values?: Record<string, string>;
    };

export const IDLE_STATE: ActionState = { status: "idle" };

export function fieldError(state: ActionState, field: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[field] : undefined;
}

/** Nilai isian terakhir saat gagal; selain itu `fallback`. */
export function valueOf(state: ActionState, field: string, fallback?: string): string | undefined {
  return state.status === "error" && state.values && field in state.values ? state.values[field] : fallback;
}

export function pickValues(form: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
}

export function withValues(state: ActionState, values: Record<string, string>): ActionState {
  return state.status === "error" ? { ...state, values } : state;
}
