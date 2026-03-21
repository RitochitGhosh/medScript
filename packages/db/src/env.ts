import { z } from "zod";

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().default("medscript"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL (PostgreSQL) is required"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`[@workspace/db] Invalid environment variables:\n${missing}`);
}

export const env = parsed.data;
