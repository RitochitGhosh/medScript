/**
 * RAG Knowledge Base Seeder
 * Usage: npx tsx src/seed-rag-script.ts --file /path/to/file.txt --category drug --source "my-doc"
 *
 * Categories: drug | diagnosis | treatment | interaction | guideline | general | icd10
 */

import { readFileSync } from "fs";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getDb } from "@workspace/db";
import { env } from "./env.js";
import type { KnowledgeCategory } from "@workspace/types";

// --- Parse CLI args ---
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
}

const filePath = getArg("file");
const category = (getArg("category") ?? "general") as KnowledgeCategory;
const source = getArg("source") ?? (filePath ? filePath.split("/").pop()! : "unknown");

if (!filePath) {
  console.error("Usage: npx tsx src/seed-rag-script.ts --file <path> [--category <cat>] [--source <name>]");
  console.error("Categories: drug | diagnosis | treatment | interaction | guideline | general | icd10");
  process.exit(1);
}

const VALID: KnowledgeCategory[] = ["drug","diagnosis","treatment","interaction","guideline","general","icd10"];
if (!VALID.includes(category)) {
  console.error(`Invalid category "${category}". Use one of: ${VALID.join(", ")}`);
  process.exit(1);
}

// --- Main ---
async function main() {
  console.log(`\nReading: ${filePath}`);
  const text = readFileSync(filePath!, "utf-8");
  console.log(`Characters: ${text.length}`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const docs = await splitter.createDocuments([text]);
  console.log(`Chunks: ${docs.length}`);

  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    dimensions: 1536,
    openAIApiKey: env.OPENAI_API_KEY,
  });

  const db = await getDb();
  const collection = db.collection("medical_knowledge");

  const BATCH = 20;
  let inserted = 0;

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const texts = batch.map((d) => d.pageContent);
    const vectors = await embeddings.embedDocuments(texts);

    const documents = batch.map((doc, j) => ({
      content: doc.pageContent,
      embedding: vectors[j],
      metadata: { source, category, chunkIndex: i + j },
      createdAt: new Date(),
    }));

    await collection.insertMany(documents);
    inserted += documents.length;
    process.stdout.write(`\r  Inserted ${inserted}/${docs.length} chunks...`);
    await new Promise((r) => setTimeout(r, 100)); // rate limit
  }

  console.log(`\n\nDone! Inserted ${inserted} chunks into medical_knowledge (category: ${category}, source: ${source})`);
  process.exit(0);
}

main().catch((e) => {
  console.error("\nFailed:", e.message);
  process.exit(1);
});
