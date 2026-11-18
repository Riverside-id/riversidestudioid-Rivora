import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, { error: "Email wajib diisi." })
  .pipe(z.email({ error: "Format email belum benar. Contoh: nama@sekolah.sch.id" }));

const password = z
  .string()
  .min(8, { error: "Kata sandi minimal 8 karakter." })
  .max(72, { error: "Kata sandi maksimal 72 karakter." });

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, { error: "Nama panggilan minimal 2 huruf." })
  .max(40, { error: "Nama panggilan maksimal 40 huruf." });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Kata sandi wajib diisi." }),
});

export const registerSchema = z
  .object({
    displayName: displayNameSchema,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Kata sandi tidak sama.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
