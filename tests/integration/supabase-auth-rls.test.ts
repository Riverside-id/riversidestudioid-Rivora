/**
 * Integrasi Supabase SUNGGUHAN (Auth + PostgREST + RLS) — Supabase Cloud atau lokal.
 *
 * Variabel (simpan di `.env.test.local`, diabaikan Git):
 *   RIVORA_TEST_SUPABASE_URL              URL project
 *   RIVORA_TEST_SUPABASE_PUBLISHABLE_KEY  kunci publishable
 *   RIVORA_TEST_SUPABASE_SECRET_KEY       kunci rahasia (HANYA untuk membuat/menghapus akun uji)
 *   RIVORA_TEST_ALLOW_CLOUD=true          wajib bila URL bukan localhost (persetujuan eksplisit)
 *
 * Akun uji memakai awalan `rivora-uji-` dan dihapus (beserta seluruh datanya, cascade) di akhir.
 * Jalankan: npm run test:integration
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseMutations } from "@/lib/data/mutations";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import type { Database } from "@/lib/supabase/database.types";
import { buildOnboardingPayload, onboardingDraftSchema } from "@/lib/validation/onboarding-submit";

const url = process.env.RIVORA_TEST_SUPABASE_URL;
const publishableKey = process.env.RIVORA_TEST_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.RIVORA_TEST_SUPABASE_SECRET_KEY;
const isLocal = Boolean(url && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url));
const enabled = Boolean(url && publishableKey && secretKey && (isLocal || process.env.RIVORA_TEST_ALLOW_CLOUD === "true"));

const TEST_PREFIX = "rivora-uji-";
const PASSWORD = `Uji-${crypto.randomUUID().slice(0, 12)}-9`;
type Client = SupabaseClient<Database>;
type Teacher = { client: Client; userId: string; email: string };

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

async function signIn(email: string): Promise<Teacher> {
  const client = createClient<Database>(url!, publishableKey!, noSession);
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) throw error ?? new Error("login gagal");
  return { client, userId: data.user.id, email };
}

function payload(semesterNumber: 1 | 2, classes: Array<[number, string]>, schedules: Array<[string, number, string, string]> = []) {
  return buildOnboardingPayload(
    onboardingDraftSchema.parse({
      displayName: "Guru Uji",
      schoolName: "",
      academicYearLabel: "2026/2027",
      semesterNumber,
      classes: classes.map(([gradeLevel, section]) => ({ gradeLevel, section })),
      schedules: schedules.map(([classLabel, weekday, startTime, endTime]) => ({ classLabel, weekday, startTime, endTime })),
    }),
  );
}

describe.skipIf(!enabled)(`Supabase ${isLocal ? "lokal" : "Cloud"}: Auth + RLS dua akun guru`, () => {
  let admin: Client;
  const created: string[] = [];
  let a: Teacher;
  let b: Teacher;

  beforeAll(async () => {
    admin = createClient<Database>(url!, secretKey!, noSession);

    // Bersihkan sisa akun uji dari run sebelumnya yang terhenti (hanya awalan rivora-uji-).
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of existing?.users ?? []) {
      if (u.email?.startsWith(TEST_PREFIX)) await admin.auth.admin.deleteUser(u.id);
    }

    const stamp = Date.now();
    const emails = [`${TEST_PREFIX}a-${stamp}@example.com`, `${TEST_PREFIX}b-${stamp}@example.com`];
    for (const [i, email] of emails.entries()) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: i === 0 ? "Bu Uji A" : "Pak Uji B" },
      });
      if (error) throw error;
      created.push(data.user.id);
    }
    a = await signIn(emails[0]);
    b = await signIn(emails[1]);

    await createSupabaseMutations(a.client, a.userId).completeOnboarding(
      payload(1, [[1, "A"], [3, "B"]], [["1A", 3, "07:30", "08:40"], ["3B", 3, "10:00", "11:00"]]),
    );
    await createSupabaseMutations(b.client, b.userId).completeOnboarding(payload(1, [[4, "B"]], [["4B", 3, "10:00", "11:00"]]));
  }, 90_000);

  afterAll(async () => {
    for (const id of created) await admin?.auth.admin.deleteUser(id);
  }, 60_000);

  const yearOf = async (t: Teacher) => (await createSupabaseRepository(t.client, t.userId).listAcademicYears())[0];

  it("login dua akun: sesi terpisah, profil dari metadata pendaftaran", async () => {
    expect(a.userId).not.toBe(b.userId);
    const pa = await createSupabaseRepository(a.client, a.userId).getProfile();
    const pb = await createSupabaseRepository(b.client, b.userId).getProfile();
    expect(pa?.onboardedAt).not.toBeNull();
    expect(pb?.onboardedAt).not.toBeNull();
  });

  it("guru B tidak bisa MEMBACA data guru A (semua tabel)", async () => {
    const yearA = await yearOf(a);
    for (const table of ["academic_years", "semesters", "teaching_classes", "weekly_schedules"] as const) {
      const { data, error } = await b.client.from(table).select("id").eq("owner_id", a.userId);
      expect(error, table).toBeNull();
      expect(data, table).toEqual([]);
    }
    const { data: profiles } = await b.client.from("profiles").select("user_id").eq("user_id", a.userId);
    expect(profiles).toEqual([]);
    expect(await createSupabaseRepository(b.client, b.userId).listClasses(yearA.id)).toEqual([]);
  });

  it("guru B tidak bisa MENGUBAH atau MENGHAPUS data guru A", async () => {
    const repoA = createSupabaseRepository(a.client, a.userId);
    const yearA = await yearOf(a);
    const [classA] = await repoA.listClasses(yearA.id);
    const [semA] = await repoA.listSemesters(yearA.id);
    const [schedA] = await repoA.listWeeklySchedules(semA.id);
    const mB = createSupabaseMutations(b.client, b.userId);

    await expect(mB.archiveClass(classA.id)).rejects.toThrow(/tidak memiliki akses/);
    await expect(mB.deleteWeeklySchedule(schedA.id)).rejects.toThrow(/tidak memiliki akses/);
    await expect(mB.updateSemester({ semesterId: semA.id, startDate: semA.startDate, endDate: semA.endDate, midtermDate: null })).rejects.toThrow(
      /tidak memiliki akses/,
    );
    await expect(mB.createClass({ academicYearId: yearA.id, gradeLevel: 2, section: "Z" })).rejects.toThrow();

    const { data: stillThere } = await a.client.from("teaching_classes").select("id, archived_at").eq("id", classA.id).single();
    expect(stillThere?.archived_at).toBeNull();
  });

  it("CRUD kelas: tambah, tolak duplikat, arsipkan (data tetap ada)", async () => {
    const m = createSupabaseMutations(a.client, a.userId);
    const repo = createSupabaseRepository(a.client, a.userId);
    const yearA = await yearOf(a);
    await m.createClass({ academicYearId: yearA.id, gradeLevel: 2, section: "A" });
    await expect(m.createClass({ academicYearId: yearA.id, gradeLevel: 2, section: "A" })).rejects.toThrow(/sudah ada/);
    const twoA = (await repo.listClasses(yearA.id)).find((c) => c.displayName === "2A")!;
    await m.archiveClass(twoA.id);
    expect((await repo.listClasses(yearA.id)).map((c) => c.displayName)).not.toContain("2A");
    const { data } = await a.client.from("teaching_classes").select("archived_at").eq("id", twoA.id).single();
    expect(data?.archived_at).not.toBeNull();
  });

  it("CRUD jadwal + bentrok: 11.00–12.00 boleh, 10.30–11.30 ditolak, hapus bisa", async () => {
    const m = createSupabaseMutations(a.client, a.userId);
    const repo = createSupabaseRepository(a.client, a.userId);
    const yearA = await yearOf(a);
    const [sem1] = await repo.listSemesters(yearA.id);
    const classA = (await repo.listClasses(yearA.id)).find((c) => c.displayName === "1A")!;
    const base = { academicYearId: yearA.id, semesterId: sem1.id, classId: classA.id, weekday: 3 as const, effectiveFrom: sem1.startDate, effectiveUntil: sem1.endDate };

    await m.createWeeklySchedule({ ...base, startTime: "11:00", endTime: "12:00" });
    await expect(m.createWeeklySchedule({ ...base, startTime: "10:30", endTime: "11:30" })).rejects.toThrow(/bentrok/);
    // Guru lain (B) mengajar Rabu 10.00–11.00 juga — tidak memengaruhi guru A.
    const added = (await repo.listWeeklySchedules(sem1.id)).find((s) => s.startTime === "11:00")!;
    await m.deleteWeeklySchedule(added.id);
    expect((await repo.listWeeklySchedules(sem1.id)).some((s) => s.id === added.id)).toBe(false);
  });

  it("CRUD periode: ubah tanggal & penanda UTS; UTS di luar semester ditolak", async () => {
    const m = createSupabaseMutations(a.client, a.userId);
    const repo = createSupabaseRepository(a.client, a.userId);
    const yearA = await yearOf(a);
    const [sem1] = await repo.listSemesters(yearA.id);
    await m.updateSemester({ semesterId: sem1.id, startDate: sem1.startDate, endDate: sem1.endDate, midtermDate: "2026-09-28" });
    expect((await repo.listSemesters(yearA.id))[0].midtermDate).toBe("2026-09-28");
    await expect(m.updateSemester({ semesterId: sem1.id, startDate: sem1.startDate, endDate: sem1.endDate, midtermDate: "2027-02-01" })).rejects.toThrow(
      /UTS\/PTS/,
    );
  });

  it("semester Ganjil & Genap terpisah: jadwal Genap tidak tampil di Ganjil", async () => {
    const m = createSupabaseMutations(a.client, a.userId);
    const repo = createSupabaseRepository(a.client, a.userId);
    const yearA = await yearOf(a);
    const [sem1, sem2] = await repo.listSemesters(yearA.id);
    const classA = (await repo.listClasses(yearA.id)).find((c) => c.displayName === "1A")!;
    // Jam yang sama dengan jadwal Ganjil — boleh karena masa berlakunya berbeda.
    await m.createWeeklySchedule({
      academicYearId: yearA.id, semesterId: sem2.id, classId: classA.id, weekday: 3,
      startTime: "07:30", endTime: "08:40", effectiveFrom: sem2.startDate, effectiveUntil: sem2.endDate,
    });
    const ganjil = await repo.listWeeklySchedules(sem1.id);
    const genap = await repo.listWeeklySchedules(sem2.id);
    expect(genap).toHaveLength(1);
    expect(ganjil.every((s) => s.semesterId === sem1.id)).toBe(true);
    expect(genap.every((s) => s.semesterId === sem2.id)).toBe(true);
  });

  it("pergantian tahun ajaran: arsip 2026/2027 tetap utuh & baca-saja, 2027/2028 aktif terpisah", async () => {
    const repo = createSupabaseRepository(a.client, a.userId);
    const oldYear = await yearOf(a);
    const oldClasses = await repo.listClasses(oldYear.id);
    const [oldSem1] = await repo.listSemesters(oldYear.id);
    const oldSchedules = await repo.listWeeklySchedules(oldSem1.id);

    const { error: archiveErr } = await a.client.from("academic_years").update({ status: "archived" }).eq("id", oldYear.id);
    expect(archiveErr).toBeNull();

    const { data: newYear, error: newErr } = await a.client
      .from("academic_years")
      .insert({ label: "2027/2028", start_date: "2027-07-01", end_date: "2028-06-30", status: "active" })
      .select("id")
      .single();
    expect(newErr).toBeNull();
    const { error: semErr } = await a.client.from("semesters").insert([
      { academic_year_id: newYear!.id, number: 1, start_date: "2027-07-01", end_date: "2027-12-31" },
      { academic_year_id: newYear!.id, number: 2, start_date: "2028-01-01", end_date: "2028-06-30" },
    ]);
    expect(semErr).toBeNull();

    // Arsip tidak hilang: kelas & jadwal lama masih terbaca.
    expect((await repo.listClasses(oldYear.id)).map((c) => c.id).sort()).toEqual(oldClasses.map((c) => c.id).sort());
    expect((await repo.listWeeklySchedules(oldSem1.id)).length).toBe(oldSchedules.length);

    // Arsip baca-saja di database.
    const m = createSupabaseMutations(a.client, a.userId);
    await expect(m.archiveClass(oldClasses[0].id)).rejects.toThrow(/diarsipkan/);
    await expect(m.createClass({ academicYearId: oldYear.id, gradeLevel: 6, section: "A" })).rejects.toThrow(/diarsipkan/);

    // Tahun baru independen; rombel yang sama boleh dibuat lagi di tahun baru.
    expect(await repo.listClasses(newYear!.id)).toEqual([]);
    await m.createClass({ academicYearId: newYear!.id, gradeLevel: 1, section: "A" });
    expect((await repo.listClasses(newYear!.id)).map((c) => c.displayName)).toEqual(["1A"]);

    // Hanya satu tahun aktif.
    const years = await repo.listAcademicYears();
    expect(years.filter((y) => y.status === "active").map((y) => y.label)).toEqual(["2027/2028"]);
    expect(years.find((y) => y.id === oldYear.id)?.status).toBe("archived");
  });

  it("pengunjung tanpa login tidak bisa membaca data", async () => {
    const anon = createClient<Database>(url!, publishableKey!, noSession);
    for (const table of ["profiles", "academic_years", "teaching_classes", "weekly_schedules"] as const) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect((data ?? []).length, table).toBe(0);
      expect(error?.code ?? "42501", table).toBe("42501");
    }
  });

  it("setelah keluar, akses data berakhir", async () => {
    const temp = await signIn(b.email);
    await temp.client.auth.signOut();
    const { data } = await temp.client.from("academic_years").select("id");
    expect(data ?? []).toEqual([]);
  });
});
