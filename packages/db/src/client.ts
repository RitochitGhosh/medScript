import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../../apps/web/.env.local") });

const MONGODB_DB_NAME = process.env["MONGODB_DB_NAME"] ?? "medscript";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

function isPermanentError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("Server selection timed out") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("Authentication failed") ||
    msg.includes("bad auth")
  );
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      await client.connect();
      const db = client.db(MONGODB_DB_NAME);

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
