import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  getPatientByClerkId,
  getConsultationById,
  createQuestion,
  getQuestionsByConsultation,
} from "@workspace/db";
import { consultationQA } from "@workspace/langchain";

const AskSchema = z.object({
  question: z.string().min(5, "Question too short").max(500, "Question too long"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await getPatientByClerkId(userId);
  if (!patient) return NextResponse.json({ error: "Patient profile not found" }, { status: 403 });

  const { id } = await params;
  const consultation = await getConsultationById(id);
  if (!consultation || consultation.patientId !== patient.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const questions = await getQuestionsByConsultation(id);
  return NextResponse.json({ questions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const patient = await getPatientByClerkId(userId);
    if (!patient) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 403 });
    }

    const { id } = await params;
    const consultation = await getConsultationById(id);
    if (!consultation || consultation.patientId !== patient.id) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    const body = (await request.json()) as unknown;
    const parsed = AskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    // Call LLM with SOAP note + drugs + diagnoses as context
    const { answer, disclaimer } = await consultationQA(
      consultation.soapNote,
      consultation.prescribedDrugs,
      consultation.diagnosisSuggestions,
      parsed.data.question
    );

    const savedQuestion = await createQuestion({
      consultationId: id,
      patientId: patient.id,
      question: parsed.data.question,
      answer: `${answer}\n\n*${disclaimer}*`,
    });

    return NextResponse.json({ question: savedQuestion });
  } catch (error) {
    console.error("Consultation Q&A error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process question" },
      { status: 500 }
    );
  }
}
