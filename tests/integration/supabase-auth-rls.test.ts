/**
 * Integrasi Supabase SUNGGUHAN (Auth + PostgREST + RLS) — butuh `supabase start` (Docker).
 * Otomatis dilewati bila variabel di bawah tidak diisi. Jalankan:
 *   npm run test:integration
 * Kunci rahasia lokal diambil dari `supabase status` dan HANYA dipakai di test ini (tidak di aplikasi).
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
const enabled = Boolean(url && publishableKey && secretKey);

type Client = SupabaseClient<Database>;
const PASSWORD = `uji-${Math.random().toString(36).slice(2)}A1`;

async function signedInClient(email: string): Promise<{ client: Client; userId: string }> {
  const client = createClient<Database>(url!, publishableKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) throw error ?? new Error("login gagal");
  return { client, userId: data.user.id };
}

describe.skipIf(!enabled)("Supabase lokal: Auth + RLS dua akun", () => {
  let admin: Client;
  const created: string[] = [];
  let a: { client: Client; userId: string };
  let b: { client: Client; userId: string };

  beforeAll(async () => {
    admin = createClient<Database>(url!, secretKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const stamp = Date.now();
    for (const [email, name] of [[`guru-a-${stamp}@contoh.test`, "Bu Rina"], [`guru-b-${stamp}@contoh.test`, "Pak Andi"]]) {
      const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: name } });
      if (error) throw error;
      created.push(data.user.id);
    }
    a = await signedInClient(`guru-a-${stamp}@contoh.test`);
    b = await signedInClient(`guru-b-${stamp}@contoh.test`);

    const draft = (classes: Array<{ gradeLevel: number; section: string }>) =>
      buildOnboardingPayload(
        onboardingDraftSchema.parse({ displayName: "Guru Uji", schoolName: "", academicYearLabel: "2026/2027", semesterNumber: 1, classes, schedules: [] }),
      );
    await createSupabaseMutations(a.client, a.userId).completeOnboarding(draft([{ gradeLevel: 1, section: "A" }]));
    await createSupabaseMutations(b.client, b.userId).completeOnboarding(draft([{ gradeLevel: 4, section: "B" }]));
  }, 60_000);

  afterAll(async () => {
    for (const id of created) await admin?.auth.admin.deleteUser(id);
  });

  it("profil dibuat trigger dari metadata pendaftaran", async () => {
    const profile = await createSupabaseRepository(a.client, a.userId).getProfile();
    expect(profile?.displayName).toBe("Guru Uji");
    expect(profile?.onboardedAt).not.toBeNull();
  });

  it("repository hanya mengembalikan data milik guru yang login", async () => {
    const repoA = createSupabaseRepository(a.client, a.userId);
    const [yearA] = await repoA.listAcademicYears();
    expect((await repoA.listClasses(yearA.id)).map((c) => c.displayName)).toEqual(["1A"]);

    // Guru B memakai ID tahun ajaran milik A → tidak melihat apa pun.
    const repoB = createSupabaseRepository(b.client, b.userId);
    expect(await repoB.listClasses(yearA.id)).toEqual([]);
    const { data } = await b.client.from("teaching_classes").select("id").eq("academic_year_id", yearA.id);
    expect(data).toEqual([]);
  });

  it("guru B tidak bisa mengarsipkan kelas guru A", async () => {
    const repoA = createSupabaseRepository(a.client, a.userId);
    const [yearA] = await repoA.listAcademicYears();
    const [classA] = await repoA.listClasses(yearA.id);
    await expect(createSupabaseMutations(b.client, b.userId).archiveClass(classA.id)).rejects.toThrow(/tidak memiliki akses/);
  });

  it("jadwal bentrok ditolak database dengan pesan Indonesia", async () => {
    const repoA = createSupabaseRepository(a.client, a.userId);
    const [yearA] = await repoA.listAcademicYears();
    const [sem1] = await repoA.listSemesters(yearA.id);
    const [classA] = await repoA.listClasses(yearA.id);
    const m = createSupabaseMutations(a.client, a.userId);
    const base = { academicYearId: yearA.id, semesterId: sem1.id, classId: classA.id, weekday: 3 as const, effectiveFrom: sem1.startDate, effectiveUntil: sem1.endDate };
    await m.createWeeklySchedule({ ...base, startTime: "10:00", endTime: "11:00" });
    await m.createWeeklySchedule({ ...base, startTime: "11:00", endTime: "12:00" });
    await expect(m.createWeeklySchedule({ ...base, startTime: "10:30", endTime: "11:30" })).rejects.toThrow(/bentrok/);
  });

  it("pengunjung tanpa login tidak bisa membaca data", async () => {
    const anon = createClient<Database>(url!, publishableKey!, { auth: { persistSession: false } });
    const { data, error } = await anon.from("teaching_classes").select("id");
    expect(data ?? []).toEqual([]);
    expect(error?.code ?? "42501").toBe("42501");
  });

  it("setelah keluar, akses data berakhir", async () => {
    const temp = await signedInClient((await admin.auth.admin.getUserById(created[0])).data.user!.email!);
    await temp.client.auth.signOut();
    const { data } = await temp.client.from("academic_years").select("id");
    expect(data ?? []).toEqual([]);
  });
});
