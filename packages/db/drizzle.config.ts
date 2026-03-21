import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../apps/web/.env.local") });

// Parse the DATABASE_URL into individual components so we can pass ssl options
// directly — avoids drizzle-kit silently failing on sslmode=require warnings.
// Neon: strip "-pooler" for direct connection (required for schema push).
const rawUrl = process.env["DATABASE_URL"]!;
const url = new URL(rawUrl.replace("-pooler.", "."));

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: true,
  },
});
