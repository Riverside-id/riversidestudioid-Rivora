/**
 * Harness test database dengan dua driver:
 *  - "pglite"   : Postgres WASM di memori + tiruan skema auth Supabase (default, tanpa Docker).
 *  - "supabase" : Postgres Supabase lokal (`supabase start`), pakai RIVORA_TEST_DB_URL.
 *                 Migrasi diasumsikan sudah diterapkan (`supabase db reset`).
 *
 * Semua skenario dijalankan sebagai peran `authenticated` dengan klaim JWT "sub" — persis cara
 * PostgREST menjalankan query guru — sehingga RLS benar-benar diuji.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Params = unknown[];
export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: Params): Promise<{ rows: T[]; affectedRows?: number }>;
  exec(sql: string): Promise<unknown>;
}

export interface TestDb {
  driver: "pglite" | "supabase";
  /** Query sebagai superuser (melewati RLS) — hanya untuk menyiapkan data uji. */
  admin: Queryable;
  /** Jalankan fn sebagai guru `uid` (atau anon bila null) di dalam satu transaksi. */
  as<T>(uid: string | null, fn: (q: Queryable) => Promise<T>): Promise<T>;
  createUser(email: string, displayName?: string): Promise<string>;
  close(): Promise<void>;
}

const ROOT = join(__dirname, "..", "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(MIGRATIONS_DIR, f));
}

async function setClaims(q: Queryable, uid: string | null) {
  if (uid) {
    await q.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
    await q.exec("set local role authenticated");
  } else {
    await q.exec("set local role anon");
  }
}

async function createPgliteDb(): Promise<TestDb> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(readFileSync(join(__dirname, "supabase-auth-stub.sql"), "utf8"));
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(file, "utf8"));
  }

  const admin: Queryable = {
    query: (sql, params) => db.query(sql, params),
    exec: (sql) => db.exec(sql),
  };

  return {
    driver: "pglite",
    admin,
    as: (uid, fn) =>
      db.transaction(async (tx) => {
        const q: Queryable = { query: (sql, params) => tx.query(sql, params), exec: (sql) => tx.exec(sql) };
        await setClaims(q, uid);
        return fn(q);
      }),
    async createUser(email, displayName) {
      const { rows } = await db.query<{ id: string }>(
        "insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, $2) returning id",
        [email, JSON.stringify(displayName ? { display_name: displayName } : {})],
      );
      return rows[0].id;
    },
    close: () => db.close(),
  };
}

async function createSupabaseDb(url: string): Promise<TestDb> {
  // Dimuat dinamis agar `pg` hanya dimuat saat menguji Supabase lokal.
  const { Client } = await import("pg");
  const client = new Client({ connectionString: url });
  await client.connect();

  const wrap = (c: InstanceType<typeof Client>): Queryable => ({
    query: async (sql, params) => {
      const r = await c.query(sql, params as unknown[]);
      return { rows: r.rows, affectedRows: r.rowCount ?? undefined };
    },
    exec: (sql) => c.query(sql),
  });
  const admin = wrap(client);

  return {
    driver: "supabase",
    admin,
    async as(uid, fn) {
      await client.query("begin");
      try {
        await setClaims(admin, uid);
        const result = await fn(admin);
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    },
    async createUser(email, displayName) {
      const { rows } = await client.query<{ id: string }>(
        `insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
         values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1, $2, '{}', now(), now())
         returning id`,
        [email, JSON.stringify(displayName ? { display_name: displayName } : {})],
      );
      return rows[0].id;
    },
    close: () => client.end(),
  };
}

export async function createTestDb(): Promise<TestDb> {
  const url = process.env.RIVORA_TEST_DB_URL;
  return url ? createSupabaseDb(url) : createPgliteDb();
}

/** Payload onboarding standar untuk test. */
export function onboardingPayload(overrides: Record<string, unknown> = {}) {
  return {
    display_name: "Bu Rina",
    school_name: "SD Uji",
    academic_year: { label: "2026/2027", start_date: "2026-07-01", end_date: "2027-06-30" },
    semesters: [
      { number: 1, start_date: "2026-07-13", end_date: "2026-12-18", midterm_date: "2026-09-28" },
      { number: 2, start_date: "2027-01-04", end_date: "2027-06-25", midterm_date: null },
    ],
    active_semester_number: 1,
    classes: [
      { grade_level: 1, section: "A" },
      { grade_level: 3, section: "B" },
    ],
    schedules: [
      { class_label: "1A", weekday: 3, start_time: "07:30", end_time: "08:40" },
      { class_label: "3B", weekday: 3, start_time: "10:00", end_time: "11:00" },
    ],
    ...overrides,
  };
}
