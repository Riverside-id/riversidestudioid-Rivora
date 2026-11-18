import { Field, inputClass, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { fieldError, valueOf, type ActionState } from "@/lib/validation/action-state";

/** Isian umum materi: topik, tingkat, dan catatan singkat (opsional). */
export function MaterialMetaFields({ state, prefix, withDescription = true }: { state: ActionState; prefix: string; withDescription?: boolean }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-topic`} label="Topik" optional error={fieldError(state, "topic")}>
          <TextInput id={`${prefix}-topic`} name="topic" maxLength={80} placeholder="Contoh: Pecahan" defaultValue={valueOf(state, "topic")} />
        </Field>
        <Field id={`${prefix}-grade`} label="Tingkat" optional>
          <select id={`${prefix}-grade`} name="gradeLevel" defaultValue={valueOf(state, "gradeLevel", "")} className={inputClass}>
            <option value="">Semua tingkat</option>
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                Kelas {g}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {withDescription ? (
        <Field id={`${prefix}-description`} label="Catatan singkat" optional error={fieldError(state, "description")}>
          <textarea
            id={`${prefix}-description`}
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={valueOf(state, "description")}
            className={cn(inputClass, "h-auto py-3")}
          />
        </Field>
      ) : null}
    </>
  );
}
