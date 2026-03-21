import { OpenAIEmbeddings } from "@langchain/openai";
import { getDb } from "@workspace/db";
import type { RagChunk, KnowledgeCategory } from "@workspace/types";

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  dimensions: 1536,
  openAIApiKey: process.env["OPENAI_API_KEY"],
});

export interface RagRetrievalResult {
  chunks: RagChunk[];
}

export async function ragRetrieval(
  query: string,
  topK: number = 5,
  categoryFilter?: KnowledgeCategory
): Promise<RagRetrievalResult> {
  const db = await getDb();

  // Embed query
  const queryEmbedding = await embeddings.embedQuery(query);

  // Build the aggregation pipeline for Atlas Vector Search
  const vectorSearchStage: Record<string, unknown> = {
    $vectorSearch: {
      index: "medical_knowledge_vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: topK * 10,
      limit: topK,
    },
  };

  // Add filter if category specified
  if (categoryFilter) {
    (vectorSearchStage["$vectorSearch"] as Record<string, unknown>)["filter"] = {
      "metadata.category": { $eq: categoryFilter },
    };
  }

  const pipeline = [
    vectorSearchStage,
    {
      $project: {
        _id: 0,
        content: 1,
        score: { $meta: "vectorSearchScore" },
        metadata: 1,
      },
    },
  ];

  const results = await db
    .collection("medical_knowledge")
    .aggregate(pipeline)
    .toArray();

  const chunks: RagChunk[] = results.map((r) => ({
    content: r["content"] as string,
    score: r["score"] as number,
    metadata: r["metadata"] as RagChunk["metadata"],
  }));

  return { chunks };
}

export function formatRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "No relevant context found in knowledge base.";

  return chunks
    .map(
      (chunk, i) =>
        `[${i + 1}] (${chunk.metadata.category} | score: ${chunk.score.toFixed(3)})\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}
