import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getDb } from "@workspace/db";
import type { KnowledgeCategory } from "@workspace/types";
import { env } from "./env";

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  dimensions: 1536,
  openAIApiKey: env.OPENAI_API_KEY,
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 100,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

export interface IngestResult {
  chunksInserted: number;
  source: string;
}

export async function ingestText(
  text: string,
  metadata: {
    source: string;
    category: KnowledgeCategory;
  }
): Promise<IngestResult> {
  const db = await getDb();
  const collection = db.collection("medical_knowledge");

  // Split into chunks
  const docs = await splitter.createDocuments([text]);

  // Embed all chunks in batches of 20
  const BATCH_SIZE = 20;
  let inserted = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const texts = batch.map((d) => d.pageContent);
    const embeddingVectors = await embeddings.embedDocuments(texts);

    const documents = batch.map((doc, j) => ({
      content: doc.pageContent,
      embedding: embeddingVectors[j],
      metadata: {
        source: metadata.source,
        category: metadata.category,
        chunkIndex: i + j,
      },
      createdAt: new Date(),
    }));

    await collection.insertMany(documents);
    inserted += documents.length;
  }

  return { chunksInserted: inserted, source: metadata.source };
}
