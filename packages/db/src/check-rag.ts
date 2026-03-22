/**
 * RAG health-check script.
 * Verifies MongoDB connection, document count, and vector search retrieval.
 * Run: npm run check-rag
 */

import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../../apps/web/.env.local") });

import { connectToDatabase } from "./client";
import { z } from "zod";

const env = z
  .object({ OPENAI_API_KEY: z.string().min(1), MONGODB_URI: z.string().min(1) })
  .parse(process.env);

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text, model: "text-embedding-3-small", dimensions: 1536 }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${await res.text()}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0]?.embedding ?? [];
}

async function main() {
  console.log("\n=== RAG Health Check ===\n");

  // 1. Connection
  console.log("1. Connecting to MongoDB Atlas...");
  const { db } = await connectToDatabase();
  console.log("   ✓ Connected\n");

  // 2. Document count
  const collection = db.collection("medical_knowledge");
  const total = await collection.countDocuments();
  const byCategory = await collection
    .aggregate([{ $group: { _id: "$metadata.category", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();

  console.log(`2. Documents in medical_knowledge: ${total}`);
  if (total === 0) {
    console.log("   ⚠  Collection is empty — run: cd packages/db && npm run seed");
    process.exit(0);
  }
  byCategory.forEach((c) => console.log(`   ${c["_id"]}: ${c["count"]}`));
  console.log();

  // 3. Sample document
  const sample = await collection.findOne({});
  const hasEmbedding = Array.isArray(sample?.["embedding"]) && (sample["embedding"] as unknown[]).length > 0;
  console.log(`3. Embeddings present: ${hasEmbedding ? "✓ yes" : "✗ no — check seed output"}`);
  if (hasEmbedding) {
    console.log(`   Dimensions: ${(sample!["embedding"] as unknown[]).length}`);
    console.log(`   Sample content: "${(sample!["content"] as string).slice(0, 80)}..."`);
  }
  console.log();

  // 4. Vector search test
  console.log("4. Testing vector search with query: \"fever chills malaria treatment\"");
  const queryVec = await embedQuery("fever chills malaria treatment");

  const vectorIndex = "medical_knowledge_vector_index";
  let results: Record<string, unknown>[] = [];
  try {
    results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: vectorIndex,
            path: "embedding",
            queryVector: queryVec,
            numCandidates: 50,
            limit: 3,
          },
        },
        { $project: { _id: 0, content: 1, score: { $meta: "vectorSearchScore" }, "metadata.category": 1, "metadata.source": 1 } },
      ])
      .toArray() as Record<string, unknown>[];

    if (results.length === 0) {
      console.log("   ⚠  Vector search returned 0 results.");
      console.log("   → The Atlas vector search index may not be created yet.");
      console.log("   → Run: cd packages/db && npm run setup");
      console.log("   → Then create the index in Atlas UI (see setup output for instructions).");
    } else {
      console.log(`   ✓ Top ${results.length} results:\n`);
      results.forEach((r, i) => {
        const meta = r["metadata"] as Record<string, unknown>;
        console.log(
          `   [${i + 1}] score=${Number(r["score"]).toFixed(3)}  category=${meta["category"]}  source=${meta["source"]}`
        );
        console.log(`       ${(r["content"] as string).slice(0, 100)}...\n`);
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("PlanExecutor error") || msg.includes("index")) {
      console.log("   ✗ Vector search failed — Atlas index not found.");
      console.log("   → Run: cd packages/db && npm run setup");
      console.log("   → Then create the index in Atlas UI using the JSON printed by that command.");
    } else {
      console.log(`   ✗ Unexpected error: ${msg}`);
    }
  }

  console.log("=== Done ===\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("Check failed:", e.message);
  process.exit(1);
});
