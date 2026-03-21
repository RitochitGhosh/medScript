/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/diagnosis
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ragRetrieval, formatRagContext, diagnosisSuggestion } from "@workspace/langchain";
import { updateDiagnoses, updateConsultationStatus } from "@workspace/db";
import { z } from "zod";

const RequestSchema = z.object({
  consultationId: z.string().uuid(),
  symptoms: z.array(z.string()),
  extractedData: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { consultationId, symptoms, extractedData } = parsed.data;

    const ragResult = await ragRetrieval(symptoms.join(", "), 5);
    const ragContext = formatRagContext(ragResult.chunks);
    const { diagnoses } = await diagnosisSuggestion(symptoms, extractedData, ragContext, ragResult.isRelevant);

    await updateDiagnoses(consultationId, diagnoses);
    await updateConsultationStatus(consultationId, "in_review");

    return NextResponse.json({ diagnoses });
  } catch (error) {
    console.error("Diagnosis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Diagnosis generation failed", code: "DIAGNOSIS_FAILED" },
      { status: 500 }
    );
  }
}
