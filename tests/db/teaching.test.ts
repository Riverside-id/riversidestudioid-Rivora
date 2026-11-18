/**
 * Test database Tahap 1 Fitur Mengajar: rencana materi per kelas, catatan pertemuan,
 * jadwal pengganti, histori status, RLS dua guru, dan arsip baca-saja.
 * Default PGlite; jalankan ulang terhadap Postgres Supabase dengan RIVORA_TEST_DB_URL.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, onboardingPayload, type Queryable, type TestDb } from "./harness";

let db: TestDb;
let guruA: string;
let guruB: string;

type Ids = { year: string; sem1: string; sem2: string; class1A: string; class3B: string; schedule1A: string };
let a: Ids;
let b: Ids;
let materialA: string;

// Semester 1 contoh: 13 Jul–18 Des 2026; jadwal 1A setiap Rabu 07.30–08.40.
const WED_1 = "2026-07-15";
const WED_2 = "2026-07-22";
const WED_3 = "2026-07-29";
const THU = "2026-07-16";

async function onboard(uid: string): Promise<Ids> {
  return db.as(uid, async (q) => {
    const year = (await q.query<{ id: string }>("select public.complete_onboarding($1::jsonb) as id", [JSON.stringify(onboardingPayload())])).rows[0].id;
    const sems = (await q.query<{ id: string }>("select id from public.semesters where academic_year_id = $1 order by number", [year])).rows;
    const classes = (await q.query<{ id: string; display_name: string }>("select id, display_name from public.teaching_classes where academic_year_id = $1", [year])).rows;
    const class1A = classes.find((c) => c.display_name === "1A")!.id;
    const schedule1A = (await q.query<{ id: string }>("select id from public.weekly_schedules where class_id = $1", [class1A])).rows[0].id;
    return { year, sem1: sems[0].id, sem2: sems[1].id, class1A, class3B: classes.find((c) => c.display_name === "3B")!.id, schedule1A };
  });
}

async function addPlan(q: Queryable, ids: Ids, input: { title: string; order?: number; sessions?: number; semester?: string; material?: string | null; classId?: string }) {
  const { rows } = await q.query<{ id: string }>(
    `insert into public.class_lesson_plans (academic_year_id, class_id, semester_id, title, sort_order, planned_sessions, material_id)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [ids.year, input.classId ?? ids.class1A, input.semester ?? ids.sem1, input.title, input.order ?? 0, input.sessions ?? 2, input.material ?? null],
  );
  return rows[0].id;
}

async function addMeeting(
  q: Queryable,
  ids: Ids,
  input: { date: string; status?: string; plan?: string | null; schedule?: string | null; replacementFor?: string | null; start?: string; end?: string; classId?: string },
) {
  const { rows } = await q.query<{ id: string }>(
    `insert into public.meeting_records
       (academic_year_id, class_id, semester_id, weekly_schedule_id, lesson_plan_id, replacement_for_id, planned_date, start_time, end_time, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [
      ids.year,
      input.classId ?? ids.class1A,
      ids.sem1,
      input.schedule === undefined ? ids.schedule1A : input.schedule,
      input.plan ?? null,
      input.replacementFor ?? null,
      input.date,
      input.start ?? "07:30",
      input.end ?? "08:40",
      input.status ?? "scheduled",
    ],
  );
  return rows[0].id;
}

beforeAll(async () => {
  db = await createTestDb();
  const suffix = Date.now();
  guruA = await db.createUser(`ajar-a-${suffix}@contoh.test`, "Bu Rina");
  guruB = await db.createUser(`ajar-b-${suffix}@contoh.test`, "Pak Dodi");
  a = await onboard(guruA);
  b = await onboard(guruB);
  materialA = await db.as(guruA, async (q) => {
    const path = `${guruA}/${randomUUID()}.pdf`;
    const { rows } = await q.query<{ id: string }>(
      `insert into public.teaching_materials (title, kind, file_path, file_name, file_size, mime_type)
       values ('Penjumlahan Dasar', 'pdf', $1, 'Penjumlahan Dasar.pdf', 2048, 'application/pdf') returning id`,
      [path],
    );
    return rows[0].id;
  });
}, 90_000);

afterAll(async () => {
  await db?.close();
});

describe("rencana materi per kelas (F06)", () => {
  it("guru membuat rencana berurutan untuk kelas & semester, menautkan file Bank Materi", async () => {
    await db.as(guruA, async (q) => {
      await addPlan(q, a, { title: "Mengenal Bilangan 1–10", order: 0, sessions: 3, material: materialA });
      await addPlan(q, a, { title: "Penjumlahan Sederhana", order: 1, sessions: 4, material: materialA });
      await addPlan(q, a, { title: "Pengurangan Sederhana", order: 2, sessions: 3 });
      // File yang sama dipakai kelas lain tanpa upload ulang.
      await addPlan(q, a, { title: "Penjumlahan (3B)", order: 0, sessions: 2, material: materialA, classId: a.class3B });
    });
    const titles = await db.as(guruA, async (q) =>
      (await q.query<{ title: string }>("select title from public.class_lesson_plans where class_id = $1 order by sort_order", [a.class1A])).rows.map((r) => r.title),
    );
    expect(titles).toEqual(["Mengenal Bilangan 1–10", "Penjumlahan Sederhana", "Pengurangan Sederhana"]);
  });

  it("menolak jumlah pertemuan di luar 1–60 dan judul terlalu pendek", async () => {
    await expect(db.as(guruA, (q) => addPlan(q, a, { title: "Topik", sessions: 0 }))).rejects.toThrow(/class_lesson_plans_sessions_range/);
    await expect(db.as(guruA, (q) => addPlan(q, a, { title: "X" }))).rejects.toThrow(/class_lesson_plans_title_length/);
  });

  it("guru tidak bisa memakai kelas atau file materi milik guru lain", async () => {
    await expect(db.as(guruB, (q) => addPlan(q, b, { title: "Curian", classId: a.class1A }))).rejects.toThrow(/class_lesson_plans_class_fk/);
    await expect(db.as(guruB, (q) => addPlan(q, b, { title: "Pakai file A", material: materialA }))).rejects.toThrow(/class_lesson_plans_material_fk/);
  });

  it("guru lain tidak bisa membaca, mengubah, atau menghapus rencana guru A", async () => {
    const seen = await db.as(guruB, async (q) => (await q.query("select id from public.class_lesson_plans where owner_id = $1", [guruA])).rows);
    expect(seen).toEqual([]);
    const updated = await db.as(guruB, async (q) => (await q.query("update public.class_lesson_plans set title = 'Diretas' returning id")).rows);
    const deleted = await db.as(guruB, async (q) => (await q.query("delete from public.class_lesson_plans where class_id = $1 returning id", [a.class1A])).rows);
    expect(updated).toEqual([]);
    expect(deleted).toEqual([]);
  });

  it("rencana tanpa catatan pelaksanaan bisa dihapus", async () => {
    const id = await db.as(guruA, (q) => addPlan(q, a, { title: "Akan dihapus", order: 9 }));
    const rows = await db.as(guruA, async (q) => (await q.query("delete from public.class_lesson_plans where id = $1 returning id", [id])).rows);
    expect(rows).toHaveLength(1);
  });
});

describe("catatan pelaksanaan pertemuan (F07)", () => {
  let plan1: string;

  beforeAll(async () => {
    plan1 = await db.as(guruA, async (q) =>
      (await q.query<{ id: string }>("select id from public.class_lesson_plans where class_id = $1 and sort_order = 0", [a.class1A])).rows[0].id,
    );
  });

  it("Tandai Selesai: tanggal pelaksanaan & waktu pencatatan diisi server, histori tercatat", async () => {
    const id = await db.as(guruA, (q) => addMeeting(q, a, { date: WED_1, status: "completed", plan: plan1 }));
    const row = await db.as(guruA, async (q) =>
      (await q.query<{ actual_date: string; completed: boolean }>(
        "select actual_date::text, completed_at is not null as completed from public.meeting_records where id = $1",
        [id],
      )).rows[0],
    );
    expect(row).toEqual({ actual_date: WED_1, completed: true });
    const events = await db.as(guruA, async (q) =>
      (await q.query("select from_status, to_status from public.meeting_status_events where meeting_id = $1", [id])).rows,
    );
    expect(events).toEqual([{ from_status: null, to_status: "completed" }]);
  });

  it("satu kejadian jadwal hanya punya satu catatan (tidak terhitung dua kali)", async () => {
    await expect(db.as(guruA, (q) => addMeeting(q, a, { date: WED_1, status: "completed", plan: plan1 }))).rejects.toThrow(
      /meeting_records_occurrence_key/,
    );
  });

  it("tanggal harus sesuai hari jadwal rutin dan berada di dalam semester", async () => {
    await expect(db.as(guruA, (q) => addMeeting(q, a, { date: THU }))).rejects.toThrow(/tidak sesuai dengan jadwal rutin/);
    await expect(db.as(guruA, (q) => addMeeting(q, a, { date: "2027-01-06" }))).rejects.toThrow(/di dalam semester/);
  });

  it("rencana dari semester lain ditolak", async () => {
    const planSem2 = await db.as(guruA, (q) => addPlan(q, a, { title: "Topik Semester 2", semester: a.sem2 }));
    await expect(db.as(guruA, (q) => addMeeting(q, a, { date: WED_3, plan: planSem2 }))).rejects.toThrow(/bukan untuk semester/);
  });

  it("ubah status Selesai → Ditunda: waktu selesai dihapus dan histori bertambah", async () => {
    const id = await db.as(guruA, async (q) =>
      (await q.query<{ id: string }>("select id from public.meeting_records where planned_date = $1", [WED_1])).rows[0].id,
    );
    await db.as(guruA, (q) => q.query("update public.meeting_records set status = 'postponed', notes = 'Rapat guru' where id = $1", [id]));
    const after = await db.as(guruA, async (q) =>
      (await q.query("select status, completed_at from public.meeting_records where id = $1", [id])).rows[0],
    );
    expect(after).toEqual({ status: "postponed", completed_at: null });
    const events = await db.as(guruA, async (q) =>
      (await q.query("select to_status from public.meeting_status_events where meeting_id = $1 order by changed_at, to_status desc", [id])).rows,
    );
    expect(events.map((e) => (e as { to_status: string }).to_status)).toEqual(["completed", "postponed"]);
  });

  it("jadwal pengganti: satu per pertemuan ditunda, hanya untuk yang berstatus Ditunda", async () => {
    const postponed = await db.as(guruA, async (q) =>
      (await q.query<{ id: string }>("select id from public.meeting_records where planned_date = $1", [WED_1])).rows[0].id,
    );
    const replacement = await db.as(guruA, (q) =>
      addMeeting(q, a, { date: "2026-07-17", schedule: null, replacementFor: postponed, start: "09:00", end: "10:00", plan: plan1 }),
    );
    expect(replacement).toBeTruthy();
    await expect(
      db.as(guruA, (q) => addMeeting(q, a, { date: "2026-07-18", schedule: null, replacementFor: postponed, start: "09:00", end: "10:00" })),
    ).rejects.toThrow(/meeting_records_replacement_key/);

    const scheduled = await db.as(guruA, (q) => addMeeting(q, a, { date: WED_2 }));
    await expect(
      db.as(guruA, (q) => addMeeting(q, a, { date: "2026-07-24", schedule: null, replacementFor: scheduled, start: "09:00", end: "10:00" })),
    ).rejects.toThrow(/hanya untuk pertemuan yang ditunda/);
  });

  it("rencana yang sudah punya catatan tidak bisa dihapus (riwayat terlindungi)", async () => {
    await expect(db.as(guruA, (q) => q.query("delete from public.class_lesson_plans where id = $1", [plan1]))).rejects.toThrow(
      /meeting_records_plan_fk/,
    );
  });

  it("catatan tidak bisa dihapus; histori tidak bisa ditulis atau diubah langsung", async () => {
    await expect(db.as(guruA, (q) => q.query("delete from public.meeting_records"))).rejects.toThrow(/permission denied/);
    await expect(
      db.as(guruA, (q) =>
        q.query("insert into public.meeting_status_events (owner_id, meeting_id, to_status) select owner_id, id, 'completed' from public.meeting_records limit 1"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("guru lain tidak bisa membaca, mengubah, atau menambah catatan di kelas guru A", async () => {
    const seen = await db.as(guruB, async (q) => (await q.query("select id from public.meeting_records where class_id = $1", [a.class1A])).rows);
    const events = await db.as(guruB, async (q) => (await q.query("select id from public.meeting_status_events")).rows);
    const updated = await db.as(guruB, async (q) =>
      (await q.query("update public.meeting_records set status = 'completed' where class_id = $1 returning id", [a.class1A])).rows,
    );
    expect(seen).toEqual([]);
    expect(events).toEqual([]);
    expect(updated).toEqual([]);
    await expect(db.as(guruB, (q) => addMeeting(q, b, { date: WED_3, classId: a.class1A, schedule: null }))).rejects.toThrow(/meeting_records_class_fk/);
    await expect(db.as(null, (q) => q.query("select 1 from public.meeting_records"))).rejects.toThrow(/permission denied/);
  });

  it("menghapus jadwal rutin tidak menghapus riwayat pertemuan", async () => {
    const before = await db.as(guruA, async (q) => (await q.query<{ n: number }>("select count(*)::int as n from public.meeting_records where class_id = $1", [a.class1A])).rows[0].n);
    await db.as(guruA, (q) => q.query("delete from public.weekly_schedules where id = $1", [a.schedule1A]));
    const rows = await db.as(guruA, async (q) =>
      (await q.query<{ n: number; detached: number }>(
        "select count(*)::int as n, count(*) filter (where weekly_schedule_id is null)::int as detached from public.meeting_records where class_id = $1",
        [a.class1A],
      )).rows[0],
    );
    expect(rows.n).toBe(before);
    expect(rows.detached).toBe(before);
  });
});

describe("arsip baca-saja & edit kelas (F03/F10)", () => {
  it("guru mengubah rombel kelas; duplikat ditolak; riwayat tetap terhubung", async () => {
    await db.as(guruB, (q) => q.query("update public.teaching_classes set section = 'C', display_name = '1C' where id = $1", [b.class1A]));
    await expect(
      db.as(guruB, (q) => q.query("update public.teaching_classes set grade_level = 3, section = 'B', display_name = '3B' where id = $1", [b.class1A])),
    ).rejects.toThrow(/teaching_classes_unique_rombel/);
  });

  it("tahun ajaran diarsipkan: rencana & catatan tidak bisa ditambah atau diubah", async () => {
    await db.admin.query("update public.academic_years set status = 'archived' where id = $1", [b.year]);
    await expect(db.as(guruB, (q) => addPlan(q, b, { title: "Setelah arsip" }))).rejects.toThrow(/diarsipkan/);
    await expect(db.as(guruB, (q) => addMeeting(q, b, { date: WED_1 }))).rejects.toThrow(/diarsipkan/);
  });
});

describe("kelas diarsipkan & dipulihkan", () => {
  it("riwayat tetap ada saat kelas diarsipkan; pemilik bisa memulihkan, guru lain tidak", async () => {
    const before = await db.as(guruA, async (q) => (await q.query<{ n: number }>("select count(*)::int as n from public.meeting_records where class_id = $1", [a.class3B])).rows[0].n);
    await db.as(guruA, (q) => q.query("update public.teaching_classes set archived_at = now() where id = $1", [a.class3B]));
    const afterArchive = await db.as(guruA, async (q) => (await q.query<{ n: number }>("select count(*)::int as n from public.meeting_records where class_id = $1", [a.class3B])).rows[0].n);
    expect(afterArchive).toBe(before);
    const plans = await db.as(guruA, async (q) => (await q.query("select id from public.class_lesson_plans where class_id = $1", [a.class3B])).rows);
    expect(plans.length).toBeGreaterThan(0);

    const byB = await db.as(guruB, async (q) => (await q.query("update public.teaching_classes set archived_at = null where id = $1 returning id", [a.class3B])).rows);
    expect(byB).toEqual([]);
    const byA = await db.as(guruA, async (q) => (await q.query("update public.teaching_classes set archived_at = null where id = $1 returning id", [a.class3B])).rows);
    expect(byA).toHaveLength(1);
  });
});
