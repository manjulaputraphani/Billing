import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env and paste the Neon dev URL.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // This Neon project also holds an unrelated app's tables (CamelCase, public)
  // and an `sdhhe_fy2025` schema. Restrict push to public so drizzle never
  // touches anything outside our own lowercase tables.
  schemaFilter: ["public"],
  dbCredentials: { url },
});
