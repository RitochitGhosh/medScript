import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { SoapNote, PrescribedDrug, DiagnosisSuggestion } from "@workspace/types";
import { env } from "../env";

const QAOutputSchema = z.object({
  answer: z.string().describe("Clear, patient-friendly answer to the question"),
  disclaimer: z
    .string()
    .describe("A brief medical disclaimer reminding them to follow their doctor's advice"),
});

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.3,
  openAIApiKey: env.OPENAI_API_KEY,
});

const structuredModel = model.withStructuredOutput(QAOutputSchema, {
  name: "answer_patient_question",
});

const qaPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a patient education assistant for an Indian healthcare platform.
Your role is to help patients understand their diagnosis, prescription, and clinical notes in plain language.

Guidelines:
- Answer in simple, clear language that a layperson can understand
- Explain medical terms when used
- When asked about drug choices (e.g. "why X not Y?"), explain the clinical reasoning from the SOAP note
- NEVER contradict the doctor's clinical notes or suggest alternative treatments
- NEVER diagnose or prescribe — only explain what the doctor has already documented
- Be empathetic and reassuring
- Keep answers concise (3-5 sentences)
- Always include a disclaimer to follow the doctor's advice

Consultation context:
SOAP Note:
{soapNote}

Prescribed Medications:
{drugs}

Diagnoses:
{diagnoses}`,
  ],
  [
    "human",
    `Patient question: {question}

Please answer this question based solely on the consultation notes above.`,
  ],
]);

const qaChain = qaPrompt.pipe(structuredModel);

export interface ConsultationQAResult {
  answer: string;
  disclaimer: string;
}

export async function consultationQA(
  soapNote: SoapNote,
  drugs: PrescribedDrug[],
  diagnoses: DiagnosisSuggestion[],
  question: string
): Promise<ConsultationQAResult> {
  const drugsSummary =
    drugs.length > 0
      ? drugs
          .map(
            (d) =>
              `- ${d.name} (${d.brandName}): ${d.dosage}, ${d.frequency} for ${d.duration}`
          )
          .join("\n")
      : "No medications prescribed.";

  const diagnosesSummary =
    diagnoses.length > 0
      ? diagnoses
          .map((d) => `- ${d.diagnosis} (confidence: ${d.confidence}%): ${d.reasoning}`)
          .join("\n")
      : "No diagnoses recorded.";

  const result = await qaChain.invoke({
    soapNote: JSON.stringify(soapNote, null, 2),
    drugs: drugsSummary,
    diagnoses: diagnosesSummary,
    question,
  });

  return {
    answer: result.answer,
    disclaimer: result.disclaimer,
  };
}
