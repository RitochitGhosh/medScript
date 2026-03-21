/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/generate-note
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { transcriptToSoap, ragRetrieval, formatRagContext, drugEnrichment } from "@workspace/langchain";
import {
  createConsultation,
  updateDrugs,
  getDoctorByClerkId,
  getPatientById,
  getConsultationsByPatient,
} from "@workspace/db";
import type { PatientGender, PatientHistoryEntry } from "@workspace/types";
import { z } from "zod";

const RequestSchema = z.object({
  patientId: z.string().uuid("patientId must be a valid UUID"),
  transcript: z.string().min(1),
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

    const { patientId, transcript } = parsed.data;

    // Resolve Clerk userId → doctor profile (UUID)
    const doctor = await getDoctorByClerkId(userId);
    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor profile not found. Please complete onboarding.", code: "DOCTOR_NOT_FOUND" },
        { status: 403 }
      );
    }

    // Resolve patientId → patient record
    const patient = await getPatientById(patientId);
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found", code: "PATIENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch patient's prior consultation history for LLM context (last 5 visits)
    const priorConsultations = await getConsultationsByPatient(patient.id, 5).catch(() => []);
    const priorHistory: PatientHistoryEntry[] = priorConsultations
      .filter((c) => c.status === "approved" || c.status === "finalized")
      .map((c) => ({
        consultationId: c.id,
        date: c.createdAt.toISOString().split("T")[0]!,
        assessment: c.soapNote.assessment,
        plan: c.soapNote.plan,
        drugs: c.prescribedDrugs.map((d) => `${d.name} ${d.dosage}`),
        diagnoses: c.diagnosisSuggestions.map((d) => d.diagnosis),
      }));

    const patCtx = {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      chiefComplaint: undefined,
      priorHistory,
    };

    // Run transcript → SOAP chain (with patient history context)
    const { soapNote, extractedData, hitlFlags } = await transcriptToSoap(transcript, patCtx);

    // RAG retrieval (best-effort — MongoDB Atlas may be paused on free tier)
    // Context is logged for future use; failure is non-fatal.
    const ragQuery = `${extractedData.symptoms.join(", ")} ${extractedData.complaints.join(", ")}`;
    try {
      const ragResult = await ragRetrieval(ragQuery, 5);
      formatRagContext(ragResult.chunks); // enrichment context — available for future use
    } catch (ragError) {
      console.warn("RAG retrieval skipped (MongoDB unavailable):", ragError instanceof Error ? ragError.message : ragError);
    }

    // Drug enrichment
    let prescribedDrugs: Awaited<ReturnType<typeof drugEnrichment>>["enrichedDrugs"] = [];
    if (extractedData.medicationsMentioned.length > 0) {
      const drugResult = await drugEnrichment(extractedData.medicationsMentioned);
      prescribedDrugs = drugResult.enrichedDrugs;
    }

    // Save to PostgreSQL
    const consultation = await createConsultation({
      doctorId: doctor.id,
      patientId: patient.id,
      patientName: patient.name,
      patientAge: patient.age,
      patientGender: patient.gender as PatientGender,
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
    });

    if (prescribedDrugs.length > 0) {
      await updateDrugs(consultation.id, prescribedDrugs);
    }

    return NextResponse.json({ consultation });
  } catch (error) {
    console.error("Generate note error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate note", code: "GENERATE_NOTE_FAILED" },
      { status: 500 }
    );
  }
}
