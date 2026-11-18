/**
 * ⚠️ DATA DEMO — HANYA UNTUK DEVELOPMENT DAN DEPLOY PREVIEW.
 *
 * Semua nama guru, sekolah, materi, jadwal, dan angka di file ini FIKTIF.
 * Tidak ada data murid (V1 memang tidak mengumpulkan data murid).
 * Data ini ditolak di build production kecuali `RIVORA_ALLOW_DEMO_DATA=true` (lihat `lib/data/index.ts`).
 */
import { addDays, weekdayOf } from "@/lib/date";
import type {
  AcademicYear,
  ClassLessonPlan,
  GradeLevel,
  ISODate,
  LocalTime,
  MeetingRecord,
  MidtermSegment,
  Profile,
  Semester,
  TeachingClass,
  TeachingMaterial,
  WeeklySchedule,
  Weekday,
} from "@/lib/domain/types";

export const DEMO_OWNER_ID = "demo-teacher";
/** Realisasi demo dibuat mundur sampai tanggal ini. */
export const DEMO_ANCHOR_DATE: ISODate = "2026-11-17";

export interface DemoDataset {
  profile: Profile;
  academicYears: AcademicYear[];
  semesters: Semester[];
  classes: TeachingClass[];
  schedules: WeeklySchedule[];
  materials: TeachingMaterial[];
  lessonPlans: ClassLessonPlan[];
  meetings: MeetingRecord[];
}

/* ------------------------------------------------------------------ periode */

const YEAR_2026 = "demo-year-2026";
const YEAR_2025 = "demo-year-2025";
const SEM_2026_1 = "demo-sem-2026-1";
const SEM_2026_2 = "demo-sem-2026-2";
const SEM_2025_1 = "demo-sem-2025-1";
const SEM_2025_2 = "demo-sem-2025-2";

const academicYears: AcademicYear[] = [
  {
    id: YEAR_2026,
    ownerId: DEMO_OWNER_ID,
    label: "2026/2027",
    startDate: "2026-07-13",
    endDate: "2027-06-25",
    status: "active",
    activeSemesterId: SEM_2026_1,
  },
  {
    id: YEAR_2025,
    ownerId: DEMO_OWNER_ID,
    label: "2025/2026",
    startDate: "2025-07-14",
    endDate: "2026-06-26",
    status: "archived",
    activeSemesterId: SEM_2025_2,
  },
];

const semesters: Semester[] = [
  { id: SEM_2026_1, academicYearId: YEAR_2026, number: 1, startDate: "2026-07-13", endDate: "2026-12-18", midtermDate: "2026-09-28" },
  { id: SEM_2026_2, academicYearId: YEAR_2026, number: 2, startDate: "2027-01-04", endDate: "2027-06-25", midtermDate: "2027-03-22" },
  { id: SEM_2025_1, academicYearId: YEAR_2025, number: 1, startDate: "2025-07-14", endDate: "2025-12-19", midtermDate: "2025-09-29" },
  { id: SEM_2025_2, academicYearId: YEAR_2025, number: 2, startDate: "2026-01-05", endDate: "2026-06-26", midtermDate: "2026-03-23" },
];

/* ------------------------------------------------------------------- kelas */

function cls(yearId: string, idPrefix: string, grade: GradeLevel, section: string): TeachingClass {
  return {
    id: `${idPrefix}-${grade}${section.toLowerCase()}`,
    ownerId: DEMO_OWNER_ID,
    academicYearId: yearId,
    gradeLevel: grade,
    section,
    displayName: `${grade}${section}`,
  };
}

const classes: TeachingClass[] = [
  cls(YEAR_2026, "demo-class", 1, "A"),
  cls(YEAR_2026, "demo-class", 2, "A"),
  cls(YEAR_2026, "demo-class", 3, "B"),
  cls(YEAR_2026, "demo-class", 4, "A"),
  cls(YEAR_2026, "demo-class", 5, "A"),
  cls(YEAR_2026, "demo-class", 6, "A"),
  cls(YEAR_2025, "demo-class-2025", 1, "A"),
  cls(YEAR_2025, "demo-class-2025", 2, "B"),
  cls(YEAR_2025, "demo-class-2025", 3, "A"),
  cls(YEAR_2025, "demo-class-2025", 4, "A"),
  cls(YEAR_2025, "demo-class-2025", 5, "A"),
];

/* ------------------------------------------------------------------ jadwal */

function sched(
  semester: Semester,
  classId: string,
  weekday: Weekday,
  startTime: LocalTime,
  endTime: LocalTime,
): WeeklySchedule {
  return {
    id: `demo-sch-${semester.number}${semester.academicYearId.slice(-2)}-${classId.replace("demo-class-", "")}-${weekday}`,
    classId,
    semesterId: semester.id,
    weekday,
    startTime,
    endTime,
    effectiveFrom: semester.startDate,
    effectiveUntil: semester.endDate,
  };
}

const s2026_1 = semesters[0];
const s2026_2 = semesters[1];

const schedules: WeeklySchedule[] = [
  // Semester 1 (Ganjil) 2026/2027 — 12 sesi Matematika per minggu.
  sched(s2026_1, "demo-class-1a", 1, "07:30", "08:40"),
  sched(s2026_1, "demo-class-4a", 1, "10:00", "11:10"),
  sched(s2026_1, "demo-class-2a", 2, "07:30", "08:40"),
  sched(s2026_1, "demo-class-5a", 2, "09:00", "10:10"),
  sched(s2026_1, "demo-class-1a", 3, "07:30", "08:40"),
  // 3B 10.00–11.00 lalu 6A 11.00–12.10: bersebelahan, tidak bentrok (kriteria F04).
  sched(s2026_1, "demo-class-3b", 3, "10:00", "11:00"),
  sched(s2026_1, "demo-class-6a", 3, "11:00", "12:10"),
  sched(s2026_1, "demo-class-5a", 3, "13:00", "14:10"),
  sched(s2026_1, "demo-class-2a", 4, "07:30", "08:40"),
  sched(s2026_1, "demo-class-4a", 4, "09:00", "10:10"),
  sched(s2026_1, "demo-class-3b", 5, "07:30", "08:40"),
  sched(s2026_1, "demo-class-6a", 5, "09:00", "10:10"),

  // Semester 2 (Genap) 2026/2027 — pola sedikit berbeda.
  sched(s2026_2, "demo-class-1a", 1, "07:30", "08:40"),
  sched(s2026_2, "demo-class-2a", 1, "09:00", "10:10"),
  sched(s2026_2, "demo-class-3b", 2, "07:30", "08:40"),
  sched(s2026_2, "demo-class-4a", 2, "09:00", "10:10"),
  sched(s2026_2, "demo-class-5a", 3, "07:30", "08:40"),
  sched(s2026_2, "demo-class-6a", 3, "09:00", "10:10"),
  sched(s2026_2, "demo-class-1a", 4, "07:30", "08:40"),
  sched(s2026_2, "demo-class-2a", 4, "10:00", "11:10"),
  sched(s2026_2, "demo-class-3b", 5, "07:30", "08:40"),
  sched(s2026_2, "demo-class-4a", 5, "09:00", "10:10"),
];

/* ------------------------------------------------------------------ materi */

function mat(
  slug: string,
  title: string,
  grade: GradeLevel,
  kind: TeachingMaterial["kind"],
  topic: string,
  createdAt: string,
  description: string | null = null,
): TeachingMaterial {
  const isFile = kind === "pdf" || kind === "ppt" || kind === "pptx";
  return {
    id: `demo-mat-${slug}`,
    ownerId: DEMO_OWNER_ID,
    title,
    description,
    topic,
    gradeLevel: grade,
    tags: [`kelas-${grade}`, topic.toLowerCase()],
    kind,
    filePath: isFile ? `demo/${slug}.${kind}` : null,
    externalUrl: kind === "video" || kind === "link" ? `https://example.com/demo/${slug}` : null,
    createdAt,
  };
}

const materials: TeachingMaterial[] = [
  mat("bilangan-20", "Bilangan sampai 20", 1, "pptx", "Bilangan", "2026-07-08T09:00:00+07:00", "Membilang dan membandingkan bilangan dengan benda konkret."),
  mat("penjumlahan-dasar", "Penjumlahan Dasar", 1, "pdf", "Operasi Hitung", "2025-07-20T09:00:00+07:00", "Lembar kerja penjumlahan sampai 20. Dipakai ulang lintas tahun."),
  mat("pengurangan-20", "Pengurangan sampai 20", 1, "pdf", "Operasi Hitung", "2026-07-08T09:10:00+07:00"),
  mat("bangun-datar-1", "Mengenal Bangun Datar", 1, "video", "Geometri", "2026-07-09T10:00:00+07:00", "Video pendek bentuk segitiga, segi empat, dan lingkaran."),
  mat("nilai-tempat", "Nilai Tempat Ratusan", 2, "pptx", "Bilangan", "2026-07-09T10:20:00+07:00"),
  mat("bersusun", "Penjumlahan & Pengurangan Bersusun", 2, "pdf", "Operasi Hitung", "2026-07-09T10:30:00+07:00"),
  mat("perkalian-berulang", "Perkalian sebagai Penjumlahan Berulang", 2, "pptx", "Operasi Hitung", "2026-07-10T08:00:00+07:00"),
  mat("pecahan-sederhana", "Pecahan Sederhana", 3, "pdf", "Pecahan", "2026-07-10T08:30:00+07:00", "Mengenal ½, ⅓, ¼ dengan kertas lipat."),
  mat("pembagian-dasar", "Pembagian Dasar", 3, "pptx", "Operasi Hitung", "2026-07-10T09:00:00+07:00"),
  mat("keliling", "Keliling Bangun Datar", 3, "note", "Geometri", "2026-07-11T08:00:00+07:00"),
  mat("faktor-kelipatan", "Faktor dan Kelipatan", 4, "pptx", "Bilangan", "2026-07-11T08:30:00+07:00"),
  mat("pecahan-senilai", "Pecahan Senilai", 4, "pdf", "Pecahan", "2026-07-11T09:00:00+07:00"),
  mat("sudut", "Mengukur Sudut", 4, "video", "Geometri", "2026-07-11T09:30:00+07:00"),
  mat("operasi-pecahan", "Operasi Hitung Pecahan", 5, "pptx", "Pecahan", "2026-07-12T08:00:00+07:00"),
  mat("kecepatan-debit", "Kecepatan dan Debit", 5, "pdf", "Pengukuran", "2026-07-12T08:30:00+07:00"),
  mat("volume", "Volume Kubus dan Balok", 5, "link", "Geometri", "2026-07-12T09:00:00+07:00"),
  mat("bilangan-bulat", "Bilangan Bulat Negatif", 6, "pptx", "Bilangan", "2026-07-12T09:30:00+07:00"),
  mat("lingkaran", "Luas dan Keliling Lingkaran", 6, "pdf", "Geometri", "2026-07-12T10:00:00+07:00"),
];

/* --------------------------------------------------------- rencana materi */

type PlanSpec = [title: string, sessions: number, segment: MidtermSegment | null, materialSlug: string | null];

function plansFor(classId: string, semesterId: string, specs: PlanSpec[]): ClassLessonPlan[] {
  return specs.map(([title, plannedSessions, midtermSegment, slug], index) => ({
    id: `demo-plan-${classId.replace("demo-class-", "")}-${semesterId.slice(-6)}-${index + 1}`,
    classId,
    semesterId,
    materialId: slug ? `demo-mat-${slug}` : null,
    title,
    sortOrder: index + 1,
    plannedSessions,
    midtermSegment,
  }));
}

const lessonPlans: ClassLessonPlan[] = [
  ...plansFor("demo-class-1a", SEM_2026_1, [
    ["Bilangan sampai 20", 3, "before", "bilangan-20"],
    ["Penjumlahan Dasar", 4, "before", "penjumlahan-dasar"],
    ["Pengurangan sampai 20", 4, "after", "pengurangan-20"],
    ["Mengenal Bangun Datar", 3, "after", "bangun-datar-1"],
  ]),
  ...plansFor("demo-class-2a", SEM_2026_1, [
    ["Nilai Tempat Ratusan", 3, "before", "nilai-tempat"],
    ["Penjumlahan & Pengurangan Bersusun", 4, "before", "bersusun"],
    ["Perkalian sebagai Penjumlahan Berulang", 4, "after", "perkalian-berulang"],
    ["Pengukuran Panjang", 3, "after", null],
  ]),
  ...plansFor("demo-class-3b", SEM_2026_1, [
    ["Pecahan Sederhana", 4, "before", "pecahan-sederhana"],
    ["Pembagian Dasar", 4, "before", "pembagian-dasar"],
    ["Keliling Bangun Datar", 3, "after", "keliling"],
  ]),
  ...plansFor("demo-class-4a", SEM_2026_1, [
    ["Faktor dan Kelipatan", 4, "before", "faktor-kelipatan"],
    ["Pecahan Senilai", 4, "before", "pecahan-senilai"],
    ["Mengukur Sudut", 3, "after", "sudut"],
    ["Luas Persegi Panjang", 3, "after", null],
  ]),
  ...plansFor("demo-class-5a", SEM_2026_1, [
    ["Operasi Hitung Pecahan", 4, "before", "operasi-pecahan"],
    ["Desimal dan Persen", 3, "before", null],
    ["Kecepatan dan Debit", 4, "after", "kecepatan-debit"],
    ["Volume Kubus dan Balok", 3, "after", "volume"],
  ]),
  // 6A sengaja belum punya rencana → tampil "Belum ada rencana" (bukan 0%).

  // Semester 2: baru 1A yang punya rencana; belum ada realisasi → 0/8 dengan penyebut jelas.
  ...plansFor("demo-class-1a", SEM_2026_2, [
    ["Bilangan sampai 100", 5, "before", null],
    ["Pengukuran Panjang Tak Baku", 3, "after", null],
  ]),

  // Tahun arsip 2025/2026 — file "Penjumlahan Dasar" yang sama dipakai ulang.
  ...plansFor("demo-class-2025-1a", SEM_2025_1, [
    ["Penjumlahan Dasar", 4, "before", "penjumlahan-dasar"],
    ["Pengurangan Dasar", 4, "after", null],
  ]),
];

/* ------------------------------------------------------ catatan realisasi */

interface MeetingSpec {
  classId: string;
  completed: number;
  exceptions?: Record<
    ISODate,
    {
      status: "postponed" | "cancelled";
      notes: string;
      replacement?: { date: ISODate; startTime: LocalTime; endTime: LocalTime };
    }
  >;
  notes?: Record<ISODate, string>;
}

/**
 * Membuat catatan pertemuan mundur dari DEMO_ANCHOR_DATE mengikuti jadwal rutin,
 * lalu menautkan pertemuan selesai ke rencana sesuai urutan.
 */
function generateMeetings(semester: Semester, spec: MeetingSpec): MeetingRecord[] {
  const classSchedules = schedules.filter(
    (s) => s.semesterId === semester.id && s.classId === spec.classId,
  );
  const plans = lessonPlans
    .filter((p) => p.semesterId === semester.id && p.classId === spec.classId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const occurrences: Array<{ date: ISODate; schedule: WeeklySchedule }> = [];
  let completedFound = 0;
  let cursor = DEMO_ANCHOR_DATE;
  while (completedFound < spec.completed && cursor >= semester.startDate) {
    for (const schedule of classSchedules) {
      if (schedule.weekday === weekdayOf(cursor)) {
        occurrences.push({ date: cursor, schedule });
        if (!spec.exceptions?.[cursor]) completedFound++;
      }
    }
    cursor = addDays(cursor, -1);
  }
  occurrences.reverse();

  let planIndex = 0;
  let usedInPlan = 0;
  const consume = (): string | null => {
    const plan = plans[planIndex];
    if (!plan) return null;
    usedInPlan++;
    if (usedInPlan >= plan.plannedSessions) {
      planIndex++;
      usedInPlan = 0;
    }
    return plan.id;
  };

  return occurrences.flatMap(({ date, schedule }) => {
    const id = `demo-meet-${schedule.id.replace("demo-sch-", "")}-${date}`;
    const exception = spec.exceptions?.[date];
    if (!exception) {
      return [
        {
          id,
          classId: spec.classId,
          semesterId: semester.id,
          weeklyScheduleId: schedule.id,
          lessonPlanId: consume(),
          plannedDate: date,
          actualDate: date,
          startTime: null,
          endTime: null,
          status: "completed" as const,
          notes: spec.notes?.[date] ?? null,
          replacementForId: null,
        },
      ];
    }
    const plannedPlanId = plans[planIndex]?.id ?? null;
    const records: MeetingRecord[] = [
      {
        id,
        classId: spec.classId,
        semesterId: semester.id,
        weeklyScheduleId: schedule.id,
        lessonPlanId: plannedPlanId,
        plannedDate: date,
        actualDate: null,
        startTime: null,
        endTime: null,
        status: exception.status,
        notes: exception.notes,
        replacementForId: null,
      },
    ];
    if (exception.replacement) {
      const { date: rDate, startTime, endTime } = exception.replacement;
      records.push({
        id: `${id}-pengganti`,
        classId: spec.classId,
        semesterId: semester.id,
        weeklyScheduleId: null,
        lessonPlanId: consume(),
        plannedDate: rDate,
        actualDate: rDate,
        startTime,
        endTime,
        status: "completed",
        notes: "Sesi pengganti.",
        replacementForId: id,
      });
    }
    return records;
  });
}

const meetings: MeetingRecord[] = [
  ...generateMeetings(s2026_1, {
    classId: "demo-class-1a",
    completed: 9,
    notes: { "2026-11-16": "Memakai stik es krim untuk membilang; kelas antusias." },
  }),
  ...generateMeetings(s2026_1, { classId: "demo-class-2a", completed: 11 }),
  ...generateMeetings(s2026_1, {
    classId: "demo-class-3b",
    completed: 4,
    exceptions: {
      // Skenario E PRD: jadwal Rabu tidak berlangsung → Ditunda + sesi pengganti.
      "2026-11-11": {
        status: "postponed",
        notes: "Kegiatan sekolah; diganti Kamis siang.",
        replacement: { date: "2026-11-12", startTime: "13:00", endTime: "14:00" },
      },
    },
  }),
  ...generateMeetings(s2026_1, { classId: "demo-class-4a", completed: 12 }),
  ...generateMeetings(s2026_1, {
    classId: "demo-class-5a",
    completed: 7,
    exceptions: { "2026-10-28": { status: "cancelled", notes: "Rapat guru; kelas ditiadakan." } },
  }),
];

/* ------------------------------------------------------------- skenario */

export type DemoScenario = "lengkap" | "kosong";

const demoProfile: Profile = {
  userId: DEMO_OWNER_ID,
  displayName: "Bu Sari",
  schoolName: "SD Contoh Rivora",
  timezone: "Asia/Jakarta",
};

export function buildDemoDataset(scenario: DemoScenario = "lengkap"): DemoDataset {
  if (scenario === "kosong") {
    // Guru baru: periode sudah dibuat, belum ada kelas/jadwal/materi.
    return {
      profile: { ...demoProfile, displayName: "Bu Guru", schoolName: null },
      academicYears: academicYears.filter((y) => y.id === YEAR_2026),
      semesters: semesters.filter((s) => s.academicYearId === YEAR_2026),
      classes: [],
      schedules: [],
      materials: [],
      lessonPlans: [],
      meetings: [],
    };
  }
  return {
    profile: demoProfile,
    academicYears,
    semesters,
    classes,
    schedules,
    materials,
    lessonPlans,
    meetings,
  };
}
