/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/seed-rag
 * Content-Type: multipart/form-data
 * Fields: file (PDF), category (string), source (string, optional)
 *
 * Doctor-only endpoint. Ingests a PDF into MongoDB Atlas Vector Search
 * so RAG retrieval can find relevant chunks before falling back to Tavily.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDoctorByClerkId } from "@workspace/db";
import { ingestText } from "@workspace/langchain";
import type { KnowledgeCategory } from "@workspace/types";
import pdfParse from "pdf-parse";

const VALID_CATEGORIES: KnowledgeCategory[] = [
  "diagnosis",
  "treatment",
  "drug",
  "interaction",
  "guideline",
  "general",
];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const doctor = await getDoctorByClerkId(userId);
    if (!doctor) {
      return NextResponse.json({ error: "Forbidden: doctors only", code: "FORBIDDEN" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const category = (formData.get("category") as string | null) ?? "general";
    const source = (formData.get("source") as string | null) ?? "uploaded-pdf";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No PDF file provided", code: "MISSING_FILE" }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category as KnowledgeCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Use one of: ${VALID_CATEGORIES.join(", ")}`, code: "INVALID_CATEGORY" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);

    if (!parsed.text.trim()) {
      return NextResponse.json({ error: "PDF has no extractable text", code: "EMPTY_PDF" }, { status: 422 });
    }

    const result = await ingestText(parsed.text, {
      source,
      category: category as KnowledgeCategory,
    });

    return NextResponse.json({
      success: true,
      chunksInserted: result.chunksInserted,
      source: result.source,
      pages: parsed.numpages,
    });
  } catch (error) {
    console.error("RAG seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed", code: "INGEST_FAILED" },
      { status: 500 }
    );
  }
}
