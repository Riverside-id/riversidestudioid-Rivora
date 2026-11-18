import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Test integrasi terhadap Supabase lokal (`supabase start`). Lihat README → Fase B. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
