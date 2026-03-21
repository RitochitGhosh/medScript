/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/generate-note
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transcriptToSoap, ragRetrieval, formatRagContext, drugEnrichment } from "@workspace/langchain";
import { createConsultation, updateDrugs } from "@workspace/db";
import type { PatientContext, PatientGender } from "@workspace/types";
import { z } from "zod";

const RequestSchema = z.object({
  transcript: z.string().min(1),
  patientContext: z.object({
    name: z.string().min(1),
    age: z.number().int().min(0).max(150),
    gender: z.enum(["male", "female", "other"]),
    chiefComplaint: z.string().optional(),
  }),
  consultationId: z.string().optional(),
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

    const { transcript, patientContext } = parsed.data;
    const doctorId = (session.user as typeof session.user & { id: string }).id ?? "unknown";

    // Run transcript → SOAP chain
    const patCtx: PatientContext = {
      name: patientContext.name,
      age: patientContext.age,
      gender: patientContext.gender as PatientGender,
      chiefComplaint: patientContext.chiefComplaint,
    };
    const { soapNote, extractedData, hitlFlags } = await transcriptToSoap(transcript, patCtx);

    // RAG retrieval for context enrichment
    const ragQuery = `${extractedData.symptoms.join(", ")} ${extractedData.complaints.join(", ")}`;
    const ragResult = await ragRetrieval(ragQuery, 5);
    const _ragContext = formatRagContext(ragResult.chunks);

    // Drug enrichment if drugs mentioned
    let prescribedDrugs: Awaited<ReturnType<typeof drugEnrichment>>["enrichedDrugs"] = [];
    if (extractedData.medicationsMentioned.length > 0) {
      const drugResult = await drugEnrichment(extractedData.medicationsMentioned);
      prescribedDrugs = drugResult.enrichedDrugs;
    }

    // Save to MongoDB
    const consultation = await createConsultation({
      doctorId,
      patientName: patientContext.name,
      patientAge: patientContext.age,
      patientGender: patientContext.gender as PatientGender,
      rawTranscript: transcript,
      soapNote,
      diagnosisSuggestions: [],
      prescribedDrugs,
      hitlFlags,
      auditLog: [
        {
          action: "consultation_created",
          timestamp: new Date(),
          aiSuggested: "SOAP note generated from voice transcript",
          doctorApproved: "pending",
        },
      ],
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (prescribedDrugs.length > 0) {
      await updateDrugs(consultation._id, prescribedDrugs);
    }

    return NextResponse.json({ consultation });
  } catch (error) {
    console.error("Generate note error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate note",
        code: "GENERATE_NOTE_FAILED",
      },
      { status: 500 }
    );
  }
}
