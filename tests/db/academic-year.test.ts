/**
 * Test database Tahap 2: pergantian tahun ajaran (start_new_academic_year) dan pemulihan arsip
 * (activate_archived_year). Data lama tidak dihapus; progres tidak ikut disalin.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, onboardingPayload, type TestDb } from "./harness";

let db: TestDb;
let guruA: string;
let guruB: string;
let oldYear: string;
let newYear: string;

const NEW_YEAR = {
  label: "2027/2028",
  start_date: "2027-07-01",
  end_date: "2028-06-30",
  semesters: [
    { number: 1, start_date: "2027-07-12", end_date: "2027-12-17", midterm_date: "2027-09-27" },
    { number: 2, start_date: "2028-01-03", end_date: "2028-06-23", midterm_date: null },
  ],
  active_semester_number: 1,
};

const one = async <T,>(uid: string, sql: string, params: unknown[] = []) =>
  db.as(uid, async (q) => (await q.query<T>(sql, params)).rows[0]);
const count = async (uid: string, sql: string, params: unknown[] = []) =>
  (await one<{ n: number }>(uid, sql, params)).n;

beforeAll(async () => {
  db = await createTestDb();
  const s = Date.now();
  guruA = await db.createUser(`tahun-a-${s}@contoh.test`, "Bu Rina");
  guruB = await db.createUser(`tahun-b-${s}@contoh.test`, "Pak Dodi");
  oldYear = (await one<{ id: string }>(guruA, "select public.complete_onboarding($1::jsonb) as id", [JSON.stringify(onboardingPayload())])).id;
  await db.as(guruB, (q) => q.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify(onboardingPayload())]));

  await db.as(guruA, async (q) => {
    const material = (await q.query<{ id: string }>(
      `insert into public.teaching_materials (title, kind, file_path, file_name, file_size, mime_type)
       values ('Bilangan', 'pdf', $1, 'Bilangan.pdf', 100, 'application/pdf') returning id`,
      [`${guruA}/${randomUUID()}.pdf`],
    )).rows[0].id;
    const [sem1, sem2] = (await q.query<{ id: string }>("select id from public.semesters where academic_year_id = $1 order by number", [oldYear])).rows;
    const classes = (await q.query<{ id: string; display_name: string }>("select id, display_name from public.teaching_classes where academic_year_id = $1", [oldYear])).rows;
    const c1A = classes.find((c) => c.display_name === "1A")!.id;
    const c3B = classes.find((c) => c.display_name === "3B")!.id;
    const insertPlan = (classId: string, semId: string, title: string, order: number, sessions: number, segment: string | null, mat: string | null) =>
      q.query(
        `insert into public.class_lesson_plans (academic_year_id, class_id, semester_id, title, sort_order, planned_sessions, midterm_segment, material_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [oldYear, classId, semId, title, order, sessions, segment, mat],
      );
    await insertPlan(c1A, sem1.id, "Mengenal Bilangan 1–10", 0, 3, "before", material);
    await insertPlan(c1A, sem1.id, "Penjumlahan Sederhana", 1, 4, "after", null);
    await insertPlan(c1A, sem2.id, "Pengukuran", 0, 2, null, null);
    await insertPlan(c3B, sem1.id, "Pecahan", 0, 3, null, material);
    const plan = (await q.query<{ id: string }>("select id from public.class_lesson_plans where title = 'Mengenal Bilangan 1–10'")).rows[0].id;
    const schedule = (await q.query<{ id: string }>("select id from public.weekly_schedules where class_id = $1", [c1A])).rows[0].id;
    await q.query(
      `insert into public.meeting_records (academic_year_id, class_id, semester_id, weekly_schedule_id, lesson_plan_id, planned_date, start_time, end_time, status)
       values ($1, $2, $3, $4, $5, '2026-07-15', '07:30', '08:40', 'completed')`,
      [oldYear, c1A, sem1.id, schedule, plan],
    );
    // Kelas 3B diarsipkan → tidak ikut disalin ke tahun baru.
    await q.query("update public.teaching_classes set archived_at = now() where id = $1", [c3B]);
  });
}, 90_000);

afterAll(async () => {
  await db?.close();
});

describe("pergantian tahun ajaran (start_new_academic_year)", () => {
  it("label duplikat ditolak dan tidak mengubah apa pun (satu transaksi)", async () => {
    await expect(
      db.as(guruA, (q) => q.query("select public.start_new_academic_year($1::jsonb)", [JSON.stringify({ ...NEW_YEAR, label: "2026/2027" })])),
    ).rejects.toThrow(/academic_years_owner_label_key/);
    const status = await one<{ status: string }>(guruA, "select status from public.academic_years where id = $1", [oldYear]);
    expect(status.status).toBe("active");
  });

  it("mengarsipkan tahun lama, membuat tahun baru, menyalin kelas/rencana/jadwal tanpa progres", async () => {
    newYear = (await one<{ id: string }>(guruA, "select public.start_new_academic_year($1::jsonb) as id", [
      JSON.stringify({ ...NEW_YEAR, copy_classes: true, copy_plans: true, copy_schedules: true }),
    ])).id;

    const years = await db.as(guruA, async (q) => (await q.query<{ label: string; status: string }>("select label, status from public.academic_years order by label")).rows);
    expect(years).toEqual([
      { label: "2026/2027", status: "archived" },
      { label: "2027/2028", status: "active" },
    ]);

    const classes = await db.as(guruA, async (q) =>
      (await q.query<{ display_name: string }>("select display_name from public.teaching_classes where academic_year_id = $1 order by display_name", [newYear])).rows.map((r) => r.display_name),
    );
    expect(classes).toEqual(["1A"]);

    const plans = await db.as(guruA, async (q) =>
      (await q.query<{ title: string; sort_order: number; planned_sessions: number; midterm_segment: string | null; has_material: boolean; number: number }>(
        `select p.title, p.sort_order, p.planned_sessions, p.midterm_segment, p.material_id is not null as has_material, s.number
         from public.class_lesson_plans p join public.semesters s on s.id = p.semester_id
         where p.academic_year_id = $1 order by s.number, p.sort_order`,
        [newYear],
      )).rows,
    );
    expect(plans).toEqual([
      { title: "Mengenal Bilangan 1–10", sort_order: 0, planned_sessions: 3, midterm_segment: "before", has_material: true, number: 1 },
      { title: "Penjumlahan Sederhana", sort_order: 1, planned_sessions: 4, midterm_segment: "after", has_material: false, number: 1 },
      { title: "Pengukuran", sort_order: 0, planned_sessions: 2, midterm_segment: null, has_material: false, number: 2 },
    ]);

    expect(await count(guruA, "select count(*)::int as n from public.meeting_records where academic_year_id = $1", [newYear])).toBe(0);
    const schedule = await one<{ effective_from: string; effective_until: string }>(
      guruA,
      "select effective_from::text, effective_until::text from public.weekly_schedules where academic_year_id = $1",
      [newYear],
    );
    expect(schedule).toEqual({ effective_from: "2027-07-12", effective_until: "2027-12-17" });
  });

  it("data tahun lama tetap utuh dan baca-saja", async () => {
    expect(await count(guruA, "select count(*)::int as n from public.meeting_records where academic_year_id = $1", [oldYear])).toBe(1);
    expect(await count(guruA, "select count(*)::int as n from public.class_lesson_plans where academic_year_id = $1", [oldYear])).toBe(4);
    expect(await count(guruA, "select count(*)::int as n from public.teaching_classes where academic_year_id = $1", [oldYear])).toBe(2);
    await expect(db.as(guruA, (q) => q.query("update public.class_lesson_plans set title = 'Ubah' where academic_year_id = $1", [oldYear]))).rejects.toThrow(/diarsipkan/);
  });

  it("guru lain tidak terpengaruh dan tidak bisa membaca tahun guru A", async () => {
    const yearsB = await db.as(guruB, async (q) => (await q.query<{ status: string }>("select status from public.academic_years")).rows);
    expect(yearsB).toEqual([{ status: "active" }]);
    expect(await count(guruB, "select count(*)::int as n from public.academic_years where owner_id = $1", [guruA])).toBe(0);
  });
});

describe("pulihkan arsip (activate_archived_year)", () => {
  it("guru lain dan pengunjung tidak bisa memulihkan tahun guru A", async () => {
    await expect(db.as(guruB, (q) => q.query("select public.activate_archived_year($1)", [oldYear]))).rejects.toThrow(/tidak ditemukan/);
    await expect(db.as(null, (q) => q.query("select public.activate_archived_year($1)", [oldYear]))).rejects.toThrow(/permission denied/);
  });

  it("tahun aktif tidak bisa 'dipulihkan'", async () => {
    await expect(db.as(guruA, (q) => q.query("select public.activate_archived_year($1)", [newYear]))).rejects.toThrow(/tidak ditemukan/);
  });

  it("memulihkan tahun lama: tahun aktif diarsipkan dulu, tetap hanya satu tahun aktif, data utuh", async () => {
    await db.as(guruA, (q) => q.query("select public.activate_archived_year($1)", [oldYear]));
    const years = await db.as(guruA, async (q) => (await q.query<{ label: string; status: string }>("select label, status from public.academic_years order by label")).rows);
    expect(years).toEqual([
      { label: "2026/2027", status: "active" },
      { label: "2027/2028", status: "archived" },
    ]);
    expect(await count(guruA, "select count(*)::int as n from public.meeting_records where academic_year_id = $1", [oldYear])).toBe(1);
    expect(await count(guruA, "select count(*)::int as n from public.class_lesson_plans where academic_year_id = $1", [newYear])).toBe(3);
  });
});
