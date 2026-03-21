/**
 * Streaming SOAP generation endpoint (Server-Sent Events)
 * Method: POST
 * Path: /api/generate-note/stream
 *
 * Emits SSE events so the UI can show live step-by-step progress
 * instead of a blocking spinner.
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { transcriptToSoap, ragRetrieval, formatRagContext, drugEnrichment, diagnosisSuggestion } from "@workspace/langchain";
import {
  createConsultation,
  updateDiagnoses,
  updateConsultationStatus,
  getDoctorByClerkId,
  getPatientById,
  getConsultationsByPatient,
} from "@workspace/db";
import type { PatientGender, PatientHistoryEntry } from "@workspace/types";
import { z } from "zod";

const RequestSchema = z.object({
  patientId: z.string().uuid(),
  transcript: z.string().min(1),
});

function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        const { userId } = await auth();
        if (!userId) {
          send("error", { message: "Unauthorized" });
          controller.close();
          return;
        }

        const body = (await request.json()) as unknown;
        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) {
          send("error", { message: parsed.error.message });
          controller.close();
          return;
        }

        const { patientId, transcript } = parsed.data;

        const doctor = await getDoctorByClerkId(userId);
        if (!doctor) {
          send("error", { message: "Doctor profile not found. Please complete onboarding." });
          controller.close();
          return;
        }

        const patient = await getPatientById(patientId);
        if (!patient) {
          send("error", { message: "Patient not found" });
          controller.close();
          return;
        }

        // Step 0: SOAP generation
        send("step", { step: 0, label: "Generating SOAP note from transcript..." });

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

        const patCtx = { name: patient.name, age: patient.age, gender: patient.gender, priorHistory };
        const { soapNote, extractedData, hitlFlags } = await transcriptToSoap(transcript, patCtx);
        send("step", { step: 0, label: "SOAP note generated", done: true });

        // Step 1: Drug enrichment
        send("step", { step: 1, label: "Enriching drug information..." });
        let prescribedDrugs: Awaited<ReturnType<typeof drugEnrichment>>["enrichedDrugs"] = [];
        if (extractedData.medicationsMentioned.length > 0) {
          const drugResult = await drugEnrichment(extractedData.medicationsMentioned);
          prescribedDrugs = drugResult.enrichedDrugs;
        }
        send("step", { step: 1, label: "Drug database updated", done: true });

        // Step 2: Diagnosis
        send("step", { step: 2, label: "Running differential diagnosis..." });
        let ragContext = "";
        let ragIsRelevant = false;
        const ragQuery = `${extractedData.symptoms.join(", ")} ${extractedData.complaints.join(", ")}`;
        try {
          const ragResult = await ragRetrieval(ragQuery, 5);
          ragContext = formatRagContext(ragResult.chunks);
          ragIsRelevant = ragResult.isRelevant;
        } catch (ragError) {
          console.warn("RAG unavailable:", ragError instanceof Error ? ragError.message : ragError);
        }
        const { diagnoses } = await diagnosisSuggestion(extractedData.symptoms, extractedData, ragContext, ragIsRelevant);
        send("step", { step: 2, label: "Diagnosis suggestions ready", done: true });

        // Step 3: Save to DB
        send("step", { step: 3, label: "Saving consultation to records..." });
        const consultation = await createConsultation({
          doctorId: doctor.id,
          patientId: patient.id,
          patientName: patient.name,
          patientAge: patient.age,
          patientGender: patient.gender as PatientGender,
          rawTranscript: transcript,
          soapNote,
          diagnosisSuggestions: diagnoses,
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

        if (diagnoses.length > 0) {
          await updateDiagnoses(consultation.id, diagnoses);
          await updateConsultationStatus(consultation.id, "in_review");
        }

        send("step", { step: 3, label: "Saved to records", done: true });
        send("done", { consultationId: consultation.id });
      } catch (error) {
        console.error("Streaming SOAP error:", error);
        send("error", { message: error instanceof Error ? error.message : "Processing failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
