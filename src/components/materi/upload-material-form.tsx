"use client";

import { createClient } from "@supabase/supabase-js";
import { FileUp, LoaderCircle } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { createMaterialAction, prepareMaterialUploadAction } from "@/app/(app)/materi/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { storageErrorMessage } from "@/lib/data/errors";
import {
  checkMaterialFile,
  formatFileSize,
  MATERIAL_ACCEPT,
  MATERIAL_BUCKET,
  titleFromFileName,
} from "@/lib/materials/file-rules";
import { fieldError, IDLE_STATE, type ActionState } from "@/lib/validation/action-state";
import type { CreateMaterialInput } from "@/lib/validation/materials";
import { cn } from "@/lib/utils";

type Phase = "idle" | "uploading" | "saving";

/**
 * Unggah materi dua langkah: (1) server memberi izin unggah sekali pakai, (2) browser mengirim file
 * langsung ke Supabase Storage, lalu (3) server menyimpan data materi setelah memeriksa file di Storage.
 */
export function UploadMaterialForm({
  supabaseUrl,
  publishableKey,
  hideHeading = false,
}: {
  supabaseUrl: string;
  publishableKey: string;
  hideHeading?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [state, setState] = useState<ActionState>(IDLE_STATE);
  const [dragging, setDragging] = useState(false);

  // Hanya dipakai untuk unggah via signed URL; tidak menyimpan sesi di browser.
  const storage = useMemo(
    () =>
      createClient(supabaseUrl, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }).storage,
    [supabaseUrl, publishableKey],
  );

  const busy = phase !== "idle";

  function chooseFile(next: File | null) {
    if (!next) return;
    const check = checkMaterialFile(next);
    if (!check.ok) {
      setFile(null);
      setState({ status: "error", fieldErrors: { file: check.message } });
      return;
    }
    setFile(next);
    setState(IDLE_STATE);
    if (!title.trim()) setTitle(titleFromFileName(next.name));
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (!busy) chooseFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    if (!file) {
      setState({ status: "error", fieldErrors: { file: "Pilih file materi terlebih dahulu." } });
      return;
    }
    if (title.trim().length < 2) {
      setState({ status: "error", fieldErrors: { title: "Judul materi minimal 2 karakter." } });
      return;
    }

    try {
      setPhase("uploading");
      setState(IDLE_STATE);
      const ticket = await prepareMaterialUploadAction({ fileName: file.name, fileSize: file.size, mimeType: file.type });
      if (!ticket.ok) {
        setState({ status: "error", message: ticket.message });
        return;
      }

      // Blob bertipe eksplisit: file besar tidak perlu dibaca seluruhnya ke memori.
      const body = new Blob([file], { type: ticket.contentType });
      const { error: uploadError } = await storage
        .from(MATERIAL_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, body, { contentType: ticket.contentType, upsert: false });
      if (uploadError) {
        setState({ status: "error", message: storageErrorMessage(uploadError) });
        return;
      }

      setPhase("saving");
      const result = await createMaterialAction({
        path: ticket.path,
        fileName: file.name,
        title,
        description: String(form.get("description") ?? ""),
        topic: String(form.get("topic") ?? ""),
        gradeLevel: String(form.get("gradeLevel") ?? "") as CreateMaterialInput["gradeLevel"],
      });
      setState(result);
      if (result.status === "success") {
        formRef.current?.reset();
        setFile(null);
        setTitle("");
      }
    } catch {
      setState({ status: "error", message: "Unggahan terputus. Periksa koneksi internet Anda, lalu coba lagi." });
    } finally {
      setPhase("idle");
    }
  }

  const fileErr = fieldError(state, "file");
  const titleErr = fieldError(state, "title");

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      {hideHeading ? null : <p className="pr-8 font-semibold text-ink">Tambah materi</p>}

      <div className="space-y-1.5">
        <label
          htmlFor="materialFile"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-white px-4 py-6 text-center transition-colors",
            "focus-within:ring-4 focus-within:ring-primary/15",
            dragging ? "border-primary bg-primary-softer" : "border-line hover:border-primary/40",
            fileErr && "border-rose-strong",
            busy && "pointer-events-none opacity-70",
          )}
        >
          <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-violet-soft text-violet">
            <FileUp className="size-6" />
          </span>
          {file ? (
            <>
              <span className="max-w-full truncate font-semibold text-ink">{file.name}</span>
              <span className="text-sm text-ink-muted">
                {formatFileSize(file.size)} · <span className="font-semibold text-primary-strong">Ganti file</span>
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">Pilih atau tarik file ke sini</span>
              <span className="text-sm text-ink-muted">PDF, Word (DOC/DOCX), atau PowerPoint (PPT/PPTX)</span>
            </>
          )}
          <input
            id="materialFile"
            name="file"
            type="file"
            accept={MATERIAL_ACCEPT}
            className="sr-only"
            aria-invalid={fileErr ? true : undefined}
            aria-describedby={fileErr ? "materialFile-error" : undefined}
            disabled={busy}
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {fileErr ? (
          <p id="materialFile-error" role="alert" className="text-sm font-medium text-rose-strong">
            {fileErr}
          </p>
        ) : null}
      </div>

      <Field id="materialTitle" label="Judul materi" error={titleErr}>
        <TextInput
          id="materialTitle"
          name="title"
          maxLength={120}
          placeholder="Contoh: Pecahan Senilai"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={titleErr}
          disabled={busy}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="materialTopic" label="Topik" optional error={fieldError(state, "topic")}>
          <TextInput id="materialTopic" name="topic" maxLength={80} placeholder="Contoh: Pecahan" disabled={busy} />
        </Field>
        <Field id="materialGrade" label="Tingkat" optional>
          <select id="materialGrade" name="gradeLevel" defaultValue="" className={inputClass} disabled={busy}>
            <option value="">Semua tingkat</option>
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                Kelas {g}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="materialDescription" label="Catatan singkat" optional error={fieldError(state, "description")}>
        <textarea
          id="materialDescription"
          name="description"
          rows={3}
          maxLength={500}
          placeholder="Contoh: Lembar kerja untuk pertemuan kedua."
          className={cn(inputClass, "h-auto py-3")}
          disabled={busy}
        />
      </Field>

      <FormMessage state={state} />
      <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
        {busy ? (
          <>
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
            {phase === "uploading" ? "Mengunggah file…" : "Menyimpan…"}
          </>
        ) : (
          "Unggah Materi"
        )}
      </Button>
    </form>
  );
}
