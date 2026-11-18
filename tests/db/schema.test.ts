/**
 * Test database Fase B: RLS dua akun, constraint, trigger, dan RPC onboarding.
 * Default berjalan di PGlite (tiruan auth Supabase). Jalankan ulang terhadap Supabase lokal:
 *   RIVORA_TEST_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, onboardingPayload, type TestDb } from "./harness";

let db: TestDb;
let guruA: string;
let guruB: string;
let yearA: string;
let sem1A: string;
let sem2A: string;
let class1A: string;
let class3B: string;

const RV_ARCHIVED = /diarsipkan dan hanya bisa dibaca/;

async function count(uid: string | null, table: string): Promise<number> {
  return db.as(uid, async (q) => {
    const { rows } = await q.query<{ n: number }>(`select count(*)::int as n from public.${table}`);
    return rows[0].n;
  });
}

beforeAll(async () => {
  db = await createTestDb();
  const suffix = Date.now();
  guruA = await db.createUser(`guru-a-${suffix}@contoh.test`, "Bu Rina");
  guruB = await db.createUser(`guru-b-${suffix}@contoh.test`);

  yearA = await db.as(guruA, async (q) => {
    const { rows } = await q.query<{ id: string }>("select public.complete_onboarding($1::jsonb) as id", [
      JSON.stringify(onboardingPayload()),
    ]);
    return rows[0].id;
  });

  const ids = await db.as(guruA, async (q) => {
    const sems = await q.query<{ id: string; number: number }>(
      "select id, number from public.semesters where academic_year_id = $1 order by number",
      [yearA],
    );
    const classes = await q.query<{ id: string; display_name: string }>(
      "select id, display_name from public.teaching_classes where academic_year_id = $1",
      [yearA],
    );
    return { sems: sems.rows, classes: classes.rows };
  });
  sem1A = ids.sems[0].id;
  sem2A = ids.sems[1].id;
  class1A = ids.classes.find((c) => c.display_name === "1A")!.id;
  class3B = ids.classes.find((c) => c.display_name === "3B")!.id;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("profil & pendaftaran", () => {
  it("trigger membuat profil otomatis dengan nama dari metadata atau email", async () => {
    const a = await db.as(guruA, (q) => q.query<{ display_name: string; timezone: string }>("select display_name, timezone from public.profiles"));
    expect(a.rows).toEqual([{ display_name: "Bu Rina", timezone: "Asia/Jakarta" }]);
    const b = await db.as(guruB, (q) => q.query<{ display_name: string }>("select display_name from public.profiles"));
    expect(b.rows[0].display_name).toMatch(/^guru-b-/);
  });

  it("guru bisa mengubah profilnya sendiri, tidak bisa profil guru lain", async () => {
    await db.as(guruB, async (q) => {
      const own = await q.query("update public.profiles set display_name = 'Pak Andi' where user_id = $1 returning user_id", [guruB]);
      expect(own.rows).toHaveLength(1);
      const other = await q.query("update public.profiles set display_name = 'Diretas' where user_id = $1 returning user_id", [guruA]);
      expect(other.rows).toHaveLength(0);
    });
  });

  it("zona waktu di luar WIB/WITA/WIT ditolak", async () => {
    await expect(
      db.as(guruB, (q) => q.query("update public.profiles set timezone = 'Europe/Paris' where user_id = $1", [guruB])),
    ).rejects.toThrow(/profiles_timezone_supported/);
  });
});

describe("onboarding (RPC complete_onboarding)", () => {
  it("menyimpan tahun ajaran, 2 semester, kelas, jadwal, dan semester aktif", async () => {
    const summary = await db.as(guruA, async (q) => {
      const year = await q.query<{ label: string; status: string; active_semester_id: string }>(
        "select label, status::text, active_semester_id from public.academic_years",
      );
      const profile = await q.query<{ onboarded: boolean }>("select onboarded_at is not null as onboarded from public.profiles");
      const schedules = await q.query<{ n: number }>("select count(*)::int as n from public.weekly_schedules where semester_id = $1", [sem1A]);
      return { year: year.rows[0], onboarded: profile.rows[0].onboarded, schedules: schedules.rows[0].n };
    });
    expect(summary.year).toEqual({ label: "2026/2027", status: "active", active_semester_id: sem1A });
    expect(summary.onboarded).toBe(true);
    expect(summary.schedules).toBe(2);
  });

  it("tidak bisa dijalankan dua kali", async () => {
    await expect(
      db.as(guruA, (q) => q.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify(onboardingPayload())])),
    ).rejects.toThrow(/Pengaturan awal sudah selesai/);
  });

  it("gagal total (rollback) bila ada jadwal bentrok di payload", async () => {
    const userC = await db.createUser(`guru-c-${Date.now()}@contoh.test`);
    const payload = onboardingPayload({
      schedules: [
        { class_label: "1A", weekday: 1, start_time: "10:00", end_time: "11:00" },
        { class_label: "3B", weekday: 1, start_time: "10:30", end_time: "11:30" },
      ],
    });
    await expect(db.as(userC, (q) => q.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify(payload)]))).rejects.toThrow(
      /weekly_schedules_no_overlap/,
    );
    expect(await count(userC, "academic_years")).toBe(0);
    const p = await db.as(userC, (q) => q.query<{ onboarded: boolean }>("select onboarded_at is not null as onboarded from public.profiles"));
    expect(p.rows[0].onboarded).toBe(false);
  });

  it("anon tidak bisa memanggil RPC", async () => {
    await expect(
      db.as(null, (q) => q.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify(onboardingPayload())])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("RLS — isolasi data antar guru", () => {
  const tables = ["profiles", "academic_years", "semesters", "teaching_classes", "weekly_schedules"];

  it("guru B tidak melihat satu pun baris milik guru A", async () => {
    for (const t of tables) {
      const rows = await db.as(guruB, (q) => q.query<{ n: number }>(`select count(*)::int as n from public.${t} where ${t === "profiles" ? "user_id" : "owner_id"} = $1`, [guruA]));
      expect(rows.rows[0].n, t).toBe(0);
    }
  });

  it("pengunjung anonim ditolak di semua tabel privat", async () => {
    for (const t of [...tables, "subjects"]) {
      await expect(count(null, t), t).rejects.toThrow(/permission denied/);
    }
  });

  it("guru B tidak bisa mengubah kelas atau jadwal guru A", async () => {
    await db.as(guruB, async (q) => {
      const cls = await q.query("update public.teaching_classes set display_name = 'X' where id = $1 returning id", [class1A]);
      expect(cls.rows).toHaveLength(0);
      const del = await q.query("delete from public.weekly_schedules where owner_id = $1 returning id", [guruA]);
      expect(del.rows).toHaveLength(0);
    });
  });

  it("guru B tidak bisa menyisipkan kelas ke tahun ajaran guru A", async () => {
    await expect(
      db.as(guruB, (q) =>
        q.query("insert into public.teaching_classes (academic_year_id, grade_level, section, display_name) values ($1, 2, 'A', '2A')", [yearA]),
      ),
    ).rejects.toThrow();
  });

  it("guru B tidak bisa menyamar sebagai pemilik baris guru A", async () => {
    await expect(
      db.as(guruB, (q) =>
        q.query(
          "insert into public.teaching_classes (owner_id, academic_year_id, grade_level, section, display_name) values ($1, $2, 2, 'A', '2A')",
          [guruA, yearA],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("mata pelajaran bisa dibaca guru tetapi tidak bisa diubah", async () => {
    const rows = await db.as(guruB, (q) => q.query<{ code: string }>("select code from public.subjects"));
    expect(rows.rows.map((r) => r.code)).toEqual(["matematika"]);
    await expect(db.as(guruB, (q) => q.query("insert into public.subjects (code, name) values ('ipa', 'IPA')"))).rejects.toThrow(/permission denied/);
  });

  it("tidak ada hapus untuk tahun ajaran, semester & kelas (arsip bukan hapus)", async () => {
    for (const t of ["academic_years", "semesters", "teaching_classes"]) {
      await expect(db.as(guruA, (q) => q.query(`delete from public.${t}`)), t).rejects.toThrow(/permission denied/);
    }
    expect(await count(guruA, "teaching_classes")).toBe(2);
  });
});

describe("aturan kelas & periode", () => {
  it("rombel duplikat pada tahun ajaran yang sama ditolak (F03)", async () => {
    await expect(
      db.as(guruA, (q) =>
        q.query("insert into public.teaching_classes (academic_year_id, grade_level, section, display_name) values ($1, 1, 'A', '1A')", [yearA]),
      ),
    ).rejects.toThrow(/teaching_classes_unique_rombel/);
  });

  it("format rombel dan tingkat divalidasi", async () => {
    await expect(
      db.as(guruA, (q) =>
        q.query("insert into public.teaching_classes (academic_year_id, grade_level, section, display_name) values ($1, 7, 'a', '7a')", [yearA]),
      ),
    ).rejects.toThrow(/teaching_classes_(grade_valid|section_format)/);
  });

  it("hanya satu tahun ajaran aktif per guru, tetapi guru lain boleh punya sendiri", async () => {
    await expect(
      db.as(guruA, (q) =>
        q.query("insert into public.academic_years (label, start_date, end_date, status) values ('2027/2028', '2027-07-01', '2028-06-30', 'active')"),
      ),
    ).rejects.toThrow(/academic_years_one_active_per_owner/);
    const ok = await db.as(guruB, (q) =>
      q.query("insert into public.academic_years (label, start_date, end_date) values ('2026/2027', '2026-07-01', '2027-06-30') returning id"),
    );
    expect(ok.rows).toHaveLength(1);
  });

  it("label tahun ajaran harus berurutan", async () => {
    await expect(
      db.as(guruA, (q) =>
        q.query("insert into public.academic_years (label, start_date, end_date, status) values ('2027/2029', '2027-07-01', '2028-06-30', 'planned')"),
      ),
    ).rejects.toThrow(/academic_years_label_format/);
  });

  it("semester harus di dalam tahun ajaran dan tidak tumpang tindih", async () => {
    await expect(
      db.as(guruA, (q) => q.query("update public.semesters set end_date = '2027-07-15' where id = $1", [sem2A])),
    ).rejects.toThrow(/di dalam tahun ajaran/);
    await expect(
      db.as(guruA, (q) => q.query("update public.semesters set start_date = '2026-12-01' where id = $1", [sem2A])),
    ).rejects.toThrow(/Semester 1 harus berakhir sebelum Semester 2/);
  });

  it("penanda UTS/PTS harus di dalam semester (boleh kosong)", async () => {
    await expect(
      db.as(guruA, (q) => q.query("update public.semesters set midterm_date = '2027-01-10' where id = $1", [sem1A])),
    ).rejects.toThrow(/semesters_midterm_inside/);
    const ok = await db.as(guruA, (q) => q.query("update public.semesters set midterm_date = null where id = $1 returning id", [sem2A]));
    expect(ok.rows).toHaveLength(1);
  });

  it("semester aktif harus milik tahun ajaran yang sama", async () => {
    const otherYear = await db.as(guruB, async (q) => {
      const y = await q.query<{ id: string }>("select id from public.academic_years limit 1");
      const s = await q.query<{ id: string }>(
        "insert into public.semesters (academic_year_id, number, start_date, end_date) values ($1, 1, '2026-07-13', '2026-12-18') returning id",
        [y.rows[0].id],
      );
      return s.rows[0].id;
    });
    await expect(
      db.as(guruA, (q) => q.query("update public.academic_years set active_semester_id = $1 where id = $2", [otherYear, yearA])),
    ).rejects.toThrow(/academic_years_active_semester_fk/);
  });
});

describe("jadwal mingguan (F04)", () => {
  const insert = (classId: string, semesterId: string, weekday: number, start: string, end: string, from = "2026-07-13", until: string | null = "2026-12-18") =>
    db.as(guruA, (q) =>
      q.query(
        `insert into public.weekly_schedules (academic_year_id, class_id, semester_id, weekday, start_time, end_time, effective_from, effective_until)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [yearA, classId, semesterId, weekday, start, end, from, until],
      ),
    );

  it("10.00–11.00 tidak bentrok dengan 11.00–12.00", async () => {
    // 3B sudah terjadwal Rabu 10.00–11.00 dari onboarding.
    const r = await insert(class1A, sem1A, 3, "11:00", "12:00");
    expect(r.rows).toHaveLength(1);
  });

  it("jam yang beririsan pada hari yang sama ditolak", async () => {
    await expect(insert(class1A, sem1A, 3, "10:30", "11:30")).rejects.toThrow(/weekly_schedules_no_overlap/);
  });

  it("jam sama di hari lain atau di semester lain diperbolehkan", async () => {
    expect((await insert(class1A, sem1A, 4, "10:00", "11:00")).rows).toHaveLength(1);
    expect((await insert(class3B, sem2A, 3, "10:00", "11:00", "2027-01-04", "2027-06-25")).rows).toHaveLength(1);
  });

  it("guru lain boleh mengajar pada jam yang sama", async () => {
    const r = await db.as(guruB, async (q) => {
      const y = await q.query<{ id: string }>("select id from public.academic_years limit 1");
      const s = await q.query<{ id: string }>("select id from public.semesters where academic_year_id = $1", [y.rows[0].id]);
      const c = await q.query<{ id: string }>(
        "insert into public.teaching_classes (academic_year_id, grade_level, section, display_name) values ($1, 1, 'A', '1A') returning id",
        [y.rows[0].id],
      );
      return q.query(
        `insert into public.weekly_schedules (academic_year_id, class_id, semester_id, weekday, start_time, end_time, effective_from, effective_until)
         values ($1, $2, $3, 3, '10:00', '11:00', '2026-07-13', '2026-12-18') returning id`,
        [y.rows[0].id, c.rows[0].id, s.rows[0].id],
      );
    });
    expect(r.rows).toHaveLength(1);
  });

  it("jam selesai harus setelah jam mulai", async () => {
    await expect(insert(class1A, sem1A, 5, "11:00", "10:00")).rejects.toThrow(/weekly_schedules_time_order/);
  });

  it("masa berlaku harus di dalam semester", async () => {
    await expect(insert(class1A, sem1A, 5, "07:00", "08:00", "2026-07-01")).rejects.toThrow(/di dalam semester/);
  });

  it("kelas dan semester harus dari tahun ajaran yang sama", async () => {
    const bSemester = await db.as(guruB, async (q) => (await q.query<{ id: string }>("select id from public.semesters limit 1")).rows[0].id);
    await expect(insert(class1A, bSemester, 6, "07:00", "08:00")).rejects.toThrow();
  });

  it("guru bisa menghapus jadwal miliknya", async () => {
    const created = await insert(class1A, sem1A, 6, "07:00", "08:00");
    const id = (created.rows[0] as { id: string }).id;
    const del = await db.as(guruA, (q) => q.query("delete from public.weekly_schedules where id = $1 returning id", [id]));
    expect(del.rows).toHaveLength(1);
  });
});

describe("arsip baca-saja (PRD §9)", () => {
  it("setelah diarsipkan: kelas, semester, dan jadwal tidak bisa diubah; pulihkan perlu ubah status", async () => {
    await db.as(guruA, (q) => q.query("update public.academic_years set status = 'archived' where id = $1", [yearA]));

    await expect(
      db.as(guruA, (q) => q.query("update public.teaching_classes set display_name = 'Ubah' where id = $1", [class1A])),
    ).rejects.toThrow(RV_ARCHIVED);
    await expect(
      db.as(guruA, (q) =>
        q.query("insert into public.teaching_classes (academic_year_id, grade_level, section, display_name) values ($1, 4, 'A', '4A')", [yearA]),
      ),
    ).rejects.toThrow(RV_ARCHIVED);
    await expect(
      db.as(guruA, (q) => q.query("update public.semesters set midterm_date = '2026-10-01' where id = $1", [sem1A])),
    ).rejects.toThrow(RV_ARCHIVED);
    await expect(
      db.as(guruA, (q) => q.query("delete from public.weekly_schedules where academic_year_id = $1", [yearA])),
    ).rejects.toThrow(RV_ARCHIVED);
    await expect(
      db.as(guruA, (q) => q.query("update public.academic_years set label = '2030/2031' where id = $1", [yearA])),
    ).rejects.toThrow(RV_ARCHIVED);

    // Data arsip tetap bisa dibaca.
    expect(await count(guruA, "weekly_schedules")).toBeGreaterThan(0);

    // Pulihkan (hanya status) diizinkan, lalu perubahan kembali bisa.
    await db.as(guruA, (q) => q.query("update public.academic_years set status = 'active' where id = $1", [yearA]));
    const ok = await db.as(guruA, (q) => q.query("update public.teaching_classes set display_name = '1A' where id = $1 returning id", [class1A]));
    expect(ok.rows).toHaveLength(1);
  });

  it("hapus akun tetap bisa walau ada tahun ajaran yang diarsipkan (cascade)", async () => {
    const userD = await db.createUser(`guru-d-${Date.now()}@contoh.test`);
    await db.as(userD, (q) => q.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify(onboardingPayload())]));
    await db.as(userD, (q) => q.query("update public.academic_years set status = 'archived'"));
    await db.admin.query("delete from auth.users where id = $1", [userD]);
    const left = await db.admin.query<{ n: number }>("select count(*)::int as n from public.academic_years where owner_id = $1", [userD]);
    expect(left.rows[0].n).toBe(0);
  });
});

describe("kontrak aplikasi ↔ database", () => {
  it("payload dari buildOnboardingPayload (kode aplikasi) diterima RPC", async () => {
    const { buildOnboardingPayload, onboardingDraftSchema } = await import("@/lib/validation/onboarding-submit");
    const payload = buildOnboardingPayload(
      onboardingDraftSchema.parse({
        displayName: "Pak Andi",
        schoolName: "",
        academicYearLabel: "2026/2027",
        semesterNumber: 2,
        classes: [{ gradeLevel: 5, section: "a" }],
        schedules: [{ classLabel: "5A", weekday: 2, startTime: "09:00", endTime: "10:10" }],
      }),
    );
    const userE = await db.createUser(`guru-e-${Date.now()}@contoh.test`);
    await db.as(userE, (q) => q.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify(payload)]));
    const result = await db.as(userE, async (q) => {
      const y = await q.query<{ label: string; start_date: string; active_number: number }>(
        `select y.label, y.start_date::text, s.number as active_number
         from public.academic_years y join public.semesters s on s.id = y.active_semester_id`,
      );
      const w = await q.query<{ effective_from: string; effective_until: string }>(
        "select effective_from::text, effective_until::text from public.weekly_schedules",
      );
      return { year: y.rows[0], schedule: w.rows[0] };
    });
    expect(result.year).toEqual({ label: "2026/2027", start_date: "2026-07-01", active_number: 2 });
    expect(result.schedule).toEqual({ effective_from: "2027-01-01", effective_until: "2027-06-30" });
  });
});

describe("kesiapan Supabase Cloud", () => {
  it("fungsi pembantu tidak bisa dipanggil langsung oleh guru maupun anon", async () => {
    await expect(db.as(guruA, (q) => q.query("select public.time_subtype_diff('10:00', '09:00')"))).rejects.toThrow(/permission denied/);
    await expect(db.as(null, (q) => q.query("select public.time_subtype_diff('10:00', '09:00')"))).rejects.toThrow(/permission denied/);
  });

  it("onboarding tetap berhasil walau profil belum ada (akun lama sebelum migration)", async () => {
    const userF = await db.createUser(`guru-f-${Date.now()}@contoh.test`, "Bu Lama");
    await db.admin.query("delete from public.profiles where user_id = $1", [userF]);
    await db.as(userF, (q) => q.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify(onboardingPayload())]));
    const p = await db.as(userF, (q) => q.query<{ display_name: string; onboarded: boolean }>("select display_name, onboarded_at is not null as onboarded from public.profiles"));
    expect(p.rows).toEqual([{ display_name: "Bu Rina", onboarded: true }]);
  });

  it("guru tidak bisa membuat profil atas nama guru lain", async () => {
    await expect(
      db.as(guruB, (q) => q.query("insert into public.profiles (user_id, display_name) values ($1, 'Palsu')", [guruA])),
    ).rejects.toThrow(/row-level security|duplicate key/);
  });
});
