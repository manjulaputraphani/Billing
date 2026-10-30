import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * DB integration tests only. These TRUNCATE tables, so they are kept out of
 * the normal suite (see vite.config.ts) and only run via `npm run test:db`.
 * They skip themselves when DATABASE_URL_TEST is not set.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/db/**/*.int.test.ts"],
  },
});
