// MongoDB — RAG vector store only
export { connectToDatabase, getDb } from "./client";

// Drizzle/PostgreSQL — all application data
export { db } from "./drizzle/client";
export * from "./drizzle/schema";
export * from "./pg-users";
export * from "./pg-doctors";
export * from "./pg-patients";
export * from "./pg-consultations";
export * from "./pg-questions";

// Shared Zod schemas (used in API route validation)
export * from "./schemas";
