import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Test integrasi terhadap Supabase sungguhan (Cloud atau lokal).
 * Variabel RIVORA_TEST_* dibaca dari `.env.test.local` (diabaikan Git) — lihat README.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
    env: loadEnv("test", process.cwd(), "RIVORA_TEST_"),
  },
});
