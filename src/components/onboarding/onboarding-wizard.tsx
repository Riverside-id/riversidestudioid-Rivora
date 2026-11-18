"use client";

import { ArrowLeft, ArrowRight, Check, CircleCheck, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { completeOnboardingAction } from "@/app/onboarding/actions";
import { DemoAuthNote } from "@/components/auth/demo-auth-note";
import { Button } from "@/components/ui/button";
import { Field, inputClass, TextInput } from "@/components/ui/field";
import { formatTimeRange, getZonedToday } from "@/lib/date";
import { semesterLabel, WEEKDAY_LABEL } from "@/lib/domain/labels";
import { timeToMinutes } from "@/lib/domain/schedule";
import type { GradeLevel, Weekday } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import {
  classDraftSchema,
  classLabel,
  defaultAcademicYearLabel,
  defaultSemesterNumber,
  findDuplicateClass,
  findScheduleClash,
  issuesToFieldErrors,
  periodStepSchema,
  scheduleDraftSchema,
  type DraftClass,
  type DraftSchedule,
} from "@/lib/validation/onboarding";

type Step = 1 | 2 | 3 | 4;

interface Draft {
  step: Step;
  displayName: string;
  schoolName: string;
  academicYearLabel: string;
  semesterNumber: 1 | 2;
  classes: DraftClass[];
  schedules: DraftSchedule[];
}

const STORAGE_KEY = "rivora:onboarding-draft:v1";
const STEPS: Array<{ n: Step; label: string }> = [
  { n: 1, label: "Periode" },
  { n: 2, label: "Kelas" },
  { n: 3, label: "Jadwal" },
  { n: 4, label: "Selesai" },
];
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6];

function initialDraft(initialDisplayName: string): Draft {
  const today = getZonedToday();
  const fallback: Draft = {
    step: 1,
    displayName: initialDisplayName,
    schoolName: "",
    academicYearLabel: defaultAcademicYearLabel(today),
    semesterNumber: defaultSemesterNumber(today),
    classes: [],
    schedules: [],
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<Draft>;
    return { ...fallback, ...saved, displayName: saved.displayName || initialDisplayName };
  } catch {
    return fallback;
  }
}

/**
 * Wizard awal maksimal 4 langkah (F01): periode → kelas → jadwal → selesai.
 * Draf disimpan di perangkat (localStorage) agar bisa dilanjutkan bila halaman tertutup.
 * Langkah terakhir mengirim draf ke Server Action → divalidasi ulang → RPC complete_onboarding
 * (satu transaksi). Mode demo: tidak ada yang disimpan ke server.
 */
export function OnboardingWizard({ demo, initialDisplayName }: { demo: boolean; initialDisplayName: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(initialDisplayName));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Penyimpanan perangkat tidak tersedia (mode privat) — wizard tetap berjalan.
    }
  }, [draft]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const goTo = (step: Step) => {
    setErrors({});
    update({ step });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------- langkah 1 ---------------- */
  function submitPeriod() {
    const result = periodStepSchema.safeParse({
      displayName: draft.displayName,
      schoolName: draft.schoolName,
      academicYearLabel: draft.academicYearLabel,
      semesterNumber: draft.semesterNumber,
    });
    if (!result.success) return setErrors(issuesToFieldErrors(result.error));
    goTo(2);
  }

  /* ---------------- langkah 2 ---------------- */
  const [classInput, setClassInput] = useState({ gradeLevel: "1", section: "" });
  function addClass() {
    const result = classDraftSchema.safeParse(classInput);
    if (!result.success) return setErrors(issuesToFieldErrors(result.error));
    const candidate: DraftClass = { gradeLevel: result.data.gradeLevel as GradeLevel, section: result.data.section };
    if (findDuplicateClass(draft.classes, candidate)) {
      return setErrors({ section: `Kelas ${classLabel(candidate)} sudah ada.` });
    }
    setErrors({});
    update({
      classes: [...draft.classes, candidate].sort(
        (a, b) => a.gradeLevel - b.gradeLevel || a.section.localeCompare(b.section),
      ),
    });
    setClassInput((c) => ({ ...c, section: "" }));
  }
  function removeClass(label: string) {
    update({
      classes: draft.classes.filter((c) => classLabel(c) !== label),
      schedules: draft.schedules.filter((s) => s.classLabel !== label),
    });
  }
  function submitClasses() {
    if (draft.classes.length === 0) return setErrors({ section: "Tambahkan minimal satu kelas." });
    goTo(3);
  }

  /* ---------------- langkah 3 ---------------- */
  const [scheduleInput, setScheduleInput] = useState({ classLabel: "", weekday: "1", startTime: "07:30", endTime: "08:40" });
  function addSchedule() {
    const input = { ...scheduleInput, classLabel: scheduleInput.classLabel || (draft.classes[0] ? classLabel(draft.classes[0]) : "") };
    const result = scheduleDraftSchema.safeParse(input);
    if (!result.success) return setErrors(issuesToFieldErrors(result.error));
    const candidate: DraftSchedule = { ...result.data, weekday: result.data.weekday as Weekday };
    const clash = findScheduleClash(draft.schedules, candidate);
    if (clash) return setErrors({ startTime: clash });
    setErrors({});
    update({ schedules: [...draft.schedules, candidate] });
  }
  function removeSchedule(index: number) {
    update({ schedules: draft.schedules.filter((_, i) => i !== index) });
  }

  /* ---------------- langkah 4 ---------------- */
  function finish() {
    setSaveError(null);
    startSaving(async () => {
      const { step: _step, ...payload } = draft;
      void _step;
      const result = await completeOnboardingAction(payload);
      if (!result.ok) {
        setSaveError(result.message);
        return;
      }
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // abaikan
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  const sortedSchedules = draft.schedules
    .map((s, index) => ({ ...s, index }))
    .sort((a, b) => a.weekday - b.weekday || timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  return (
    <div className="card p-5 sm:p-8">
      {/* indikator langkah */}
      <ol aria-label="Langkah pengaturan awal" className="mb-8 grid grid-cols-4 gap-2">
        {STEPS.map(({ n, label }) => {
          const done = draft.step > n;
          const current = draft.step === n;
          return (
            <li key={n} aria-current={current ? "step" : undefined} className="flex flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-full text-base font-bold",
                  done && "bg-mint text-white",
                  current && "bg-primary text-white ring-4 ring-primary/15",
                  !done && !current && "bg-primary-softer text-ink-muted",
                )}
              >
                {done ? <Check aria-hidden className="size-5" /> : n}
                {done ? <span className="sr-only">selesai</span> : null}
              </span>
              <span className={cn("text-sm", current ? "font-bold text-ink" : "text-ink-muted")}>{label}</span>
            </li>
          );
        })}
      </ol>

      {draft.step === 1 ? (
        <section aria-labelledby="langkah-1" className="space-y-5">
          <div>
            <h1 id="langkah-1" className="text-2xl font-extrabold text-navy sm:text-3xl">Kenalan dulu, yuk</h1>
            <p className="mt-1 text-ink-muted">Isi nama panggilan dan periode yang sedang berjalan.</p>
          </div>
          <Field id="displayName" label="Nama panggilan" hint="Contoh: Bu Sari atau Pak Andi." error={errors.displayName}>
            <TextInput id="displayName" value={draft.displayName} onChange={(e) => update({ displayName: e.target.value })} autoComplete="nickname" hasHint error={errors.displayName} />
          </Field>
          <Field id="schoolName" label="Nama sekolah" optional error={errors.schoolName}>
            <TextInput id="schoolName" value={draft.schoolName} onChange={(e) => update({ schoolName: e.target.value })} autoComplete="organization" error={errors.schoolName} />
          </Field>
          <Field id="academicYearLabel" label="Tahun ajaran" hint="Format: 2026/2027" error={errors.academicYearLabel}>
            <TextInput id="academicYearLabel" value={draft.academicYearLabel} onChange={(e) => update({ academicYearLabel: e.target.value })} inputMode="numeric" hasHint error={errors.academicYearLabel} />
          </Field>
          <fieldset>
            <legend className="mb-2 text-[15px] font-semibold text-ink">Semester yang sedang berjalan</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([1, 2] as const).map((n) => (
                <label
                  key={n}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                    draft.semesterNumber === n ? "border-primary bg-primary-softer" : "border-line hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    name="semesterNumber"
                    value={n}
                    checked={draft.semesterNumber === n}
                    onChange={() => update({ semesterNumber: n })}
                    className="size-5 accent-[var(--color-primary)]"
                  />
                  <span className="font-semibold text-ink">{semesterLabel(n)}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Tanggal semester dan penanda UTS/PTS bisa diatur nanti. UTS/PTS bukan pergantian semester.
            </p>
          </fieldset>
        </section>
      ) : null}

      {draft.step === 2 ? (
        <section aria-labelledby="langkah-2" className="space-y-5">
          <div>
            <h1 id="langkah-2" className="text-2xl font-extrabold text-navy sm:text-3xl">Kelas yang Anda ajar</h1>
            <p className="mt-1 text-ink-muted">Tambahkan setiap rombel Matematika, misalnya 1A, 3B, 5A.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
            <Field id="gradeLevel" label="Tingkat">
              <select id="gradeLevel" value={classInput.gradeLevel} onChange={(e) => setClassInput((c) => ({ ...c, gradeLevel: e.target.value }))} className={inputClass}>
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>Kelas {g}</option>
                ))}
              </select>
            </Field>
            <Field id="section" label="Rombel" error={errors.section}>
              <TextInput
                id="section"
                value={classInput.section}
                maxLength={2}
                placeholder="A"
                onChange={(e) => setClassInput((c) => ({ ...c, section: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addClass();
                  }
                }}
                error={errors.section}
                className="uppercase"
              />
            </Field>
            <Button variant="secondary" onClick={addClass} className="h-12 sm:mt-[30px]">
              <Plus aria-hidden className="size-5" /> Tambah Kelas
            </Button>
          </div>
          {draft.classes.length > 0 ? (
            <ul aria-label="Kelas yang ditambahkan" className="flex flex-wrap gap-2.5">
              {draft.classes.map((c) => {
                const label = classLabel(c);
                return (
                  <li key={label} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pr-1 pl-4 font-bold text-primary-strong">
                    Kelas {label}
                    <button type="button" onClick={() => removeClass(label)} aria-label={`Hapus Kelas ${label}`} className="grid size-9 place-items-center rounded-full hover:bg-white/70">
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-primary-softer/60 p-4 text-center text-ink-muted">
              Belum ada kelas. Tambah kelas pertama Anda.
            </p>
          )}
        </section>
      ) : null}

      {draft.step === 3 ? (
        <section aria-labelledby="langkah-3" className="space-y-5">
          <div>
            <h1 id="langkah-3" className="text-2xl font-extrabold text-navy sm:text-3xl">Jadwal Matematika mingguan</h1>
            <p className="mt-1 text-ink-muted">Masukkan hari dan jam rutin untuk setiap kelas. Bisa diubah kapan saja.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="classLabel" label="Kelas" error={errors.classLabel}>
              <select id="classLabel" value={scheduleInput.classLabel || (draft.classes[0] ? classLabel(draft.classes[0]) : "")} onChange={(e) => setScheduleInput((s) => ({ ...s, classLabel: e.target.value }))} className={inputClass}>
                {draft.classes.map((c) => (
                  <option key={classLabel(c)} value={classLabel(c)}>Kelas {classLabel(c)}</option>
                ))}
              </select>
            </Field>
            <Field id="weekday" label="Hari">
              <select id="weekday" value={scheduleInput.weekday} onChange={(e) => setScheduleInput((s) => ({ ...s, weekday: e.target.value }))} className={inputClass}>
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>{WEEKDAY_LABEL[d]}</option>
                ))}
              </select>
            </Field>
            <Field id="startTime" label="Jam mulai" error={errors.startTime}>
              <TextInput id="startTime" type="time" value={scheduleInput.startTime} onChange={(e) => setScheduleInput((s) => ({ ...s, startTime: e.target.value }))} error={errors.startTime} />
            </Field>
            <Field id="endTime" label="Jam selesai" error={errors.endTime}>
              <TextInput id="endTime" type="time" value={scheduleInput.endTime} onChange={(e) => setScheduleInput((s) => ({ ...s, endTime: e.target.value }))} error={errors.endTime} />
            </Field>
          </div>
          <Button variant="secondary" onClick={addSchedule} className="w-full sm:w-auto">
            <Plus aria-hidden className="size-5" /> Tambah Jadwal
          </Button>
          {sortedSchedules.length > 0 ? (
            <ul aria-label="Jadwal yang ditambahkan" className="space-y-2">
              {sortedSchedules.map((s) => (
                <li key={`${s.classLabel}-${s.weekday}-${s.startTime}`} className="flex items-center gap-3 rounded-xl border border-line p-2.5 pl-3">
                  <span className="rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary-strong tabular-nums">
                    {formatTimeRange(s.startTime, s.endTime)}
                  </span>
                  <span className="flex-1 font-semibold text-ink">
                    {WEEKDAY_LABEL[s.weekday]} · Kelas {s.classLabel}
                  </span>
                  <button type="button" onClick={() => removeSchedule(s.index)} aria-label={`Hapus jadwal Kelas ${s.classLabel} hari ${WEEKDAY_LABEL[s.weekday]}`} className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-rose-soft hover:text-rose-strong">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-primary-softer/60 p-4 text-center text-ink-muted">
              Belum ada jadwal. Anda juga bisa melewati langkah ini dan mengaturnya nanti.
            </p>
          )}
        </section>
      ) : null}

      {draft.step === 4 ? (
        <section aria-labelledby="langkah-4" className="space-y-5">
          <div className="flex flex-col items-center text-center">
            <span aria-hidden className="mb-3 grid size-16 place-items-center rounded-full bg-mint-soft text-mint">
              <CircleCheck className="size-9" />
            </span>
            <h1 id="langkah-4" className="text-2xl font-extrabold text-navy sm:text-3xl">Siap mengajar, {draft.displayName || "Bu/Pak Guru"}!</h1>
            <p className="mt-1 text-ink-muted">Materi bisa ditambahkan nanti dari menu Materi.</p>
          </div>
          <dl className="divide-y divide-line rounded-2xl border border-line">
            {[
              ["Periode", `${draft.academicYearLabel} · ${semesterLabel(draft.semesterNumber)}`],
              ["Kelas", draft.classes.map(classLabel).join(", ") || "–"],
              ["Jadwal mingguan", `${draft.schedules.length} sesi`],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:justify-between">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {demo ? (
            <DemoAuthNote>
              Mode demo: isian wizard tidak disimpan ke server. Beranda menampilkan data contoh.
            </DemoAuthNote>
          ) : (
            <p className="text-sm text-ink-muted">
              Tanggal tahun ajaran diisi otomatis (1 Juli – 30 Juni; Semester 1 Juli–Desember, Semester 2
              Januari–Juni) dan bisa disesuaikan di Pengaturan.
            </p>
          )}
          {saveError ? (
            <p role="alert" className="rounded-xl bg-rose-soft px-3.5 py-2.5 text-[15px] text-rose-strong">
              {saveError}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* navigasi */}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        {draft.step > 1 ? (
          <Button variant="ghost" onClick={() => goTo((draft.step - 1) as Step)}>
            <ArrowLeft aria-hidden className="size-5" /> Kembali
          </Button>
        ) : (
          <p className="text-sm text-ink-muted">Draf tersimpan otomatis di perangkat ini.</p>
        )}
        {draft.step === 1 ? (
          <Button size="lg" onClick={submitPeriod}>Lanjut <ArrowRight aria-hidden className="size-5" /></Button>
        ) : draft.step === 2 ? (
          <Button size="lg" onClick={submitClasses}>Lanjut <ArrowRight aria-hidden className="size-5" /></Button>
        ) : draft.step === 3 ? (
          <Button size="lg" onClick={() => goTo(4)}>
            {draft.schedules.length > 0 ? "Lanjut" : "Lewati dulu"} <ArrowRight aria-hidden className="size-5" />
          </Button>
        ) : (
          <Button size="lg" onClick={finish} disabled={saving} aria-busy={saving}>
            {saving ? (
              <>
                <LoaderCircle aria-hidden className="size-5 animate-spin" /> Menyimpan…
              </>
            ) : (
              <>
                {demo ? "Masuk ke Beranda" : "Simpan & Masuk ke Beranda"} <ArrowRight aria-hidden className="size-5" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
