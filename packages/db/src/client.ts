import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../../apps/web/.env.local") });

import { env } from "./env";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

function isPermanentError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("Server selection timed out") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("Authentication failed") ||
    msg.includes("bad auth") ||
    msg.includes("SSL alert") ||
    msg.includes("certificate") ||
    msg.includes("tlsv1")
  );
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const client = new MongoClient(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        family: 4, // Force IPv4 — Atlas IPv6 requires separate ::/0 allowlist entry
      });

      await client.connect();
      const db = client.db(env.MONGODB_DB_NAME);

      cachedClient = client;
      cachedDb = db;

      return { client, db };
    } catch (error) {
      attempt++;

      if (isPermanentError(error)) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `MongoDB connection failed (not retrying — likely an IP allowlist or DNS issue):\n` +
          `  ${msg}\n\n` +
          `Fix: Go to MongoDB Atlas → Network Access → Add your current IP address.`
        );
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `MongoDB connection failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }

  throw new Error("Failed to connect to MongoDB");
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}
