/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/diagnosis
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ragRetrieval, formatRagContext, diagnosisSuggestion } from "@workspace/langchain";
import { updateDiagnoses, updateConsultationStatus } from "@workspace/db";
import { z } from "zod";

const RequestSchema = z.object({
  consultationId: z.string().min(1),
  symptoms: z.array(z.string()),
  extractedData: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as unknown;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { consultationId, symptoms, extractedData } = parsed.data;

    // RAG retrieval for diagnosis context
    const ragResult = await ragRetrieval(symptoms.join(", "), 5);
    const ragContext = formatRagContext(ragResult.chunks);

    // Generate diagnoses
    const { diagnoses } = await diagnosisSuggestion(symptoms, extractedData, ragContext);

    // Save to MongoDB and update status to in_review
    await updateDiagnoses(consultationId, diagnoses);
    await updateConsultationStatus(consultationId, "in_review");

    return NextResponse.json({ diagnoses });
  } catch (error) {
    console.error("Diagnosis error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Diagnosis generation failed",
        code: "DIAGNOSIS_FAILED",
      },
      { status: 500 }
    );
  }
}
