import { eq, desc } from "drizzle-orm";
import { db } from "./drizzle/client";
import { consultationQuestions } from "./drizzle/schema";
import type { ConsultationQuestion } from "@workspace/types";

function toQuestion(row: typeof consultationQuestions.$inferSelect): ConsultationQuestion {
  return {
    id: row.id,
    consultationId: row.consultationId,
    patientId: row.patientId,
    question: row.question,
    answer: row.answer,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createQuestion(data: {
  consultationId: string;
  patientId: string;
  question: string;
  answer?: string;
}): Promise<ConsultationQuestion> {
  const [row] = await db
    .insert(consultationQuestions)
    .values({
      consultationId: data.consultationId,
      patientId: data.patientId,
      question: data.question,
      answer: data.answer ?? null,
    })
    .returning();
  return toQuestion(row!);
}

export async function answerQuestion(id: string, answer: string): Promise<boolean> {
  const result = await db
    .update(consultationQuestions)
    .set({ answer, updatedAt: new Date() })
    .where(eq(consultationQuestions.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function getQuestionsByConsultation(
  consultationId: string
): Promise<ConsultationQuestion[]> {
  const rows = await db.query.consultationQuestions.findMany({
    where: eq(consultationQuestions.consultationId, consultationId),
    orderBy: [desc(consultationQuestions.createdAt)],
  });
  return rows.map(toQuestion);
}

export async function getQuestionsByPatient(
  patientId: string,
  limit = 20
): Promise<ConsultationQuestion[]> {
  const rows = await db.query.consultationQuestions.findMany({
    where: eq(consultationQuestions.patientId, patientId),
    orderBy: [desc(consultationQuestions.createdAt)],
    limit,
  });
  return rows.map(toQuestion);
}
