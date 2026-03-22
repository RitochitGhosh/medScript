import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../../apps/web/.env.local") });

import { env } from "./env";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

function classifyError(error: unknown): "auth" | "dns" | "timeout" | "unknown" {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("Authentication failed") || msg.includes("bad auth")) return "auth";
  if (msg.includes("ENOTFOUND") || msg.includes("querySrv") || msg.includes("DNS")) return "dns";
  if (msg.includes("timed out") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) return "timeout";
  return "unknown";
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  let lastError: unknown;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = new MongoClient(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 20000, // generous for cellular / high-latency links
        connectTimeoutMS: 25000,
        socketTimeoutMS: 30000,
        family: 4, // Force IPv4 — Atlas IPv6 requires separate ::/0 allowlist entry
      });

      await client.connect();
      const db = client.db(env.MONGODB_DB_NAME);

      cachedClient = client;
      cachedDb = db;

      return { client, db };
    } catch (error) {
      lastError = error;
      const kind = classifyError(error);
      const raw = error instanceof Error ? error.message : String(error);

      // Auth and DNS errors won't be fixed by retrying — fail fast with a clear message
      if (kind === "auth") {
        throw new Error(`MongoDB authentication failed — check MONGODB_URI credentials.\n  ${raw}`);
      }
      if (kind === "dns") {
        throw new Error(
          `MongoDB DNS resolution failed — the Atlas SRV record could not be looked up.\n` +
          `  ${raw}\n\n` +
          `Possible fixes:\n` +
          `  1. Switch to a network/WiFi with reliable DNS (cellular sometimes blocks SRV lookups)\n` +
          `  2. Set a public DNS on your device: Google (8.8.8.8) or Cloudflare (1.1.1.1)\n` +
          `  3. Check Atlas → Network Access that 0.0.0.0/0 is listed and ACTIVE (green)`
        );
      }

      // Timeout — worth retrying with backoff
      if (attempt < maxAttempts) {
        const wait = attempt * 1500;
        console.warn(`[MongoDB] attempt ${attempt}/${maxAttempts} failed (${kind}): ${raw} — retrying in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  const raw = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `MongoDB connection failed after ${maxAttempts} attempts.\n` +
    `  Last error: ${raw}\n\n` +
    `Possible fixes:\n` +
    `  1. Check Atlas → Network Access — 0.0.0.0/0 must be listed and ACTIVE (green, not pending)\n` +
    `  2. Check Atlas → Database → cluster is not paused (free tier pauses after inactivity)\n` +
    `  3. Verify MONGODB_URI in .env.local is correct\n` +
    `  4. Try switching to WiFi — cellular networks sometimes have SRV/DNS issues`
  );
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}
