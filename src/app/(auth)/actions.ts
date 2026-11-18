"use server";

import { redirect } from "next/navigation";
import { readDataConfig } from "@/lib/data/config";
import { authErrorMessage } from "@/lib/data/errors";
import { getSiteOrigin } from "@/lib/server/site-url";
import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { pickValues, withValues, type ActionState } from "@/lib/validation/action-state";
import { forgotPasswordSchema, loginSchema, registerSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors } from "@/lib/validation/onboarding";
import { newPasswordSchema } from "@/lib/validation/settings";

const isDemo = () => readDataConfig().source === "fixture";
const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function signInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await signIn(form), pickValues(form, ["email"]));
}

async function signIn(form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: text(form, "email"), password: text(form, "password") });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };
  if (isDemo()) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorMessage(error) };
  redirect("/dashboard");
}

export async function signUpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await signUp(form), pickValues(form, ["displayName", "email"]));
}

async function signUp(form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    displayName: text(form, "displayName"),
    email: text(form, "email"),
    password: text(form, "password"),
    confirmPassword: text(form, "confirmPassword"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };
  if (isDemo()) redirect("/onboarding");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      // Template email bawaan Cloud (PKCE) kembali ke sini dengan ?code=…; template token_hash juga didukung.
      emailRedirectTo: `${await getSiteOrigin()}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) return { status: "error", message: authErrorMessage(error) };
  // Konfirmasi email dimatikan → langsung ada sesi.
  if (data.session) redirect("/onboarding");
  return {
    status: "success",
    message: `Kami sudah mengirim tautan konfirmasi ke ${parsed.data.email}. Buka email tersebut untuk mengaktifkan akun, lalu lanjutkan pengaturan awal.`,
  };
}

export async function forgotPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return withValues(await forgotPassword(form), pickValues(form, ["email"]));
}

async function forgotPassword(form: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: text(form, "email") });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };

  if (!isDemo()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${await getSiteOrigin()}/auth/confirm?next=/reset-password`,
    });
    // Hanya batas permintaan yang ditampilkan; selebihnya pesan sama agar email terdaftar tidak bisa ditebak.
    if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
      return { status: "error", message: authErrorMessage(error) };
    }
  }
  return {
    status: "success",
    message: "Jika email tersebut terdaftar, tautan untuk membuat kata sandi baru akan dikirim. Periksa juga folder spam.",
  };
}

/** Dipakai halaman /reset-password (sesi pemulihan dari tautan email) dan Pengaturan. */
export async function updatePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse({
    password: text(form, "password"),
    confirmPassword: text(form, "confirmPassword"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: issuesToFieldErrors(parsed.error) };
  if (isDemo()) return { status: "error", message: "Mode demo: kata sandi tidak bisa diubah." };

  const supabase = await createSupabaseServerClient();
  if (!(await getVerifiedUserId(supabase))) {
    return { status: "error", message: "Tautan sudah tidak berlaku. Minta tautan reset kata sandi yang baru." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };
  return { status: "success", message: "Kata sandi berhasil diperbarui." };
}

export async function signOutAction(): Promise<void> {
  if (!isDemo()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
