import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env";
import * as schema from "./schema";

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    // Strip parameters node-postgres doesn't support
    const connectionString = env.DATABASE_URL
      .replace(/[&?]channel_binding=[^&]*/g, "")
      .replace(/[&?]uselibpqcompat=[^&]*/g, "");
    _pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

export const db = drizzle(getPool(), { schema });
