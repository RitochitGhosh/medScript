 /**
 * MongoDB Atlas Vector Search Index Setup Script
 * Run: npx tsx src/setup.ts
 *
 * IMPORTANT: This creates the vector search index required for RAG retrieval.
 * You must have a MongoDB Atlas cluster (M10 or higher) for vector search.
 */

import { connectToDatabase } from "./client";

async function setupVectorSearchIndex() {
  console.log("Connecting to MongoDB...");
  const { db } = await connectToDatabase();

  const collectionName = "medical_knowledge";

  // Ensure collection exists
  const collections = await db.listCollections({ name: collectionName }).toArray();
  if (collections.length === 0) {
    await db.createCollection(collectionName);
    console.log(`Created collection: ${collectionName}`);
  }

  console.log("\n=== VECTOR SEARCH INDEX SETUP ===");
  console.log(
    "MongoDB Atlas Vector Search index must be created via Atlas UI or Atlas Admin API."
  );
  console.log("\nSteps to create the index in Atlas UI:");
  console.log("1. Go to your Atlas cluster → Browse Collections");
  console.log("2. Select the 'medscript' database → 'medical_knowledge' collection");
  console.log("3. Click 'Search Indexes' tab → 'Create Search Index'");
  console.log("4. Choose 'JSON Editor' and paste the following configuration:\n");

  const indexDefinition = {
    name: "medical_knowledge_vector_index",
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: 1536,
          similarity: "cosine",
          
        },
        {
          type: "filter",
          path: "metadata.category",
        },
        {
          type: "filter",
          path: "metadata.tags",
        },
      ],
    },
  };

  console.log(JSON.stringify(indexDefinition, null, 2));

  console.log("\n5. Click 'Next' and then 'Create Search Index'");
  console.log("6. Wait for the index to be ACTIVE (may take 1-2 minutes)");
  console.log("\nAlternatively, use the Atlas Admin API:");
  console.log("POST https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/fts/indexes");

  // Also create regular indexes for query performance
  const collection = db.collection(collectionName);
  await collection.createIndex({ "metadata.category": 1 });
  await collection.createIndex({ "metadata.tags": 1 });
  console.log("\nCreated regular indexes on metadata.category and metadata.tags");

  // Create indexes on consultations collection
  const consultations = db.collection("consultations");
  await consultations.createIndex({ doctorId: 1 });
  await consultations.createIndex({ status: 1 });
  await consultations.createIndex({ createdAt: -1 });
  await consultations.createIndex({ doctorId: 1, status: 1 });
  console.log("Created indexes on consultations collection");

  console.log("\nSetup complete!");
  process.exit(0);
}

setupVectorSearchIndex().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
