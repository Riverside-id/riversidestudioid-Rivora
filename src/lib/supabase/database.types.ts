/**
 * Tipe database Supabase (skema public) — Fase B.
 *
 * Ditulis manual mengikuti format `supabase gen types typescript` karena Docker belum tersedia
 * saat Fase B dimulai. Setelah Supabase lokal berjalan, regenerasi dengan:
 *   npm run db:types
 * dan pastikan tidak ada perbedaan bermakna.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string;
          school_name: string | null;
          timezone: string;
          onboarded_at: string | null;
        } & Timestamps;
        Insert: {
          user_id: string;
          display_name: string;
          school_name?: string | null;
          timezone?: string;
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      subjects: {
        Row: { code: string; name: string; education_level: string; created_at: string };
        Insert: { code: string; name: string; education_level?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
        Relationships: [];
      };
      academic_years: {
        Row: {
          id: string;
          owner_id: string;
          label: string;
          start_date: string;
          end_date: string;
          status: Database["public"]["Enums"]["academic_year_status"];
          active_semester_id: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          label: string;
          start_date: string;
          end_date: string;
          status?: Database["public"]["Enums"]["academic_year_status"];
          active_semester_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["academic_years"]["Insert"]>;
        Relationships: [];
      };
      semesters: {
        Row: {
          id: string;
          owner_id: string;
          academic_year_id: string;
          number: number;
          start_date: string;
          end_date: string;
          midterm_date: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          academic_year_id: string;
          number: number;
          start_date: string;
          end_date: string;
          midterm_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["semesters"]["Insert"]>;
        Relationships: [];
      };
      teaching_classes: {
        Row: {
          id: string;
          owner_id: string;
          academic_year_id: string;
          subject_code: string;
          grade_level: number;
          section: string;
          display_name: string;
          archived_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          academic_year_id: string;
          subject_code?: string;
          grade_level: number;
          section: string;
          display_name: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teaching_classes"]["Insert"]>;
        Relationships: [];
      };
      teaching_materials: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          topic: string | null;
          grade_level: number | null;
          tags: string[];
          kind: string;
          file_path: string | null;
          file_name: string | null;
          file_size: number | null;
          mime_type: string | null;
          external_url: string | null;
          archived_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          title: string;
          description?: string | null;
          topic?: string | null;
          grade_level?: number | null;
          tags?: string[];
          kind: string;
          file_path?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          external_url?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teaching_materials"]["Insert"]>;
        Relationships: [];
      };
      class_lesson_plans: {
        Row: {
          id: string;
          owner_id: string;
          academic_year_id: string;
          class_id: string;
          semester_id: string;
          material_id: string | null;
          title: string;
          sort_order: number;
          planned_sessions: number;
          midterm_segment: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          academic_year_id: string;
          class_id: string;
          semester_id: string;
          material_id?: string | null;
          title: string;
          sort_order?: number;
          planned_sessions: number;
          midterm_segment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["class_lesson_plans"]["Insert"]>;
        Relationships: [];
      };
      meeting_records: {
        Row: {
          id: string;
          owner_id: string;
          academic_year_id: string;
          class_id: string;
          semester_id: string;
          weekly_schedule_id: string | null;
          lesson_plan_id: string | null;
          replacement_for_id: string | null;
          planned_date: string;
          actual_date: string | null;
          start_time: string;
          end_time: string;
          status: string;
          summary: string | null;
          notes: string | null;
          completed_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          academic_year_id: string;
          class_id: string;
          semester_id: string;
          weekly_schedule_id?: string | null;
          lesson_plan_id?: string | null;
          replacement_for_id?: string | null;
          planned_date: string;
          actual_date?: string | null;
          start_time: string;
          end_time: string;
          status?: string;
          summary?: string | null;
          notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meeting_records"]["Insert"]>;
        Relationships: [];
      };
      meeting_status_events: {
        Row: {
          id: string;
          owner_id: string;
          meeting_id: string;
          from_status: string | null;
          to_status: string;
          changed_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          meeting_id: string;
          from_status?: string | null;
          to_status: string;
          changed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meeting_status_events"]["Insert"]>;
        Relationships: [];
      };
      weekly_schedules: {
        Row: {
          id: string;
          owner_id: string;
          academic_year_id: string;
          class_id: string;
          semester_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          effective_from: string;
          effective_until: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          academic_year_id: string;
          class_id: string;
          semester_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          effective_from: string;
          effective_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["weekly_schedules"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      complete_onboarding: { Args: { payload: Json }; Returns: string };
    };
    Enums: {
      academic_year_status: "active" | "planned" | "archived";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type TableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
