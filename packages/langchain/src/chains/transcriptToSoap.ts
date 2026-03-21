import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { PatientContext, SoapNote, HitlFlag, ExtractedClinicalData, PatientHistoryEntry } from "@workspace/types";
import { env } from "../env";

const ExtractedDataSchema = z.object({
  symptoms: z.array(z.string()).describe("List of symptoms mentioned"),
  vitals: z.array(z.string()).describe("Any vital signs mentioned (BP, pulse, temp, SpO2, etc.)"),
  complaints: z.array(z.string()).describe("Chief complaints and duration"),
  duration: z.string().describe("Duration of illness"),
  medicationsMentioned: z.array(z.string()).describe("Any medications mentioned by patient"),
});

const SoapWithConfidenceSchema = z.object({
  subjective: z.string().describe("Patient's subjective complaints and history"),
  subjectiveConfidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
  objective: z.string().describe("Objective findings, vitals, examination findings"),
  objectiveConfidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
  assessment: z.string().describe("Clinical assessment and differential diagnoses"),
  assessmentConfidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
  plan: z.string().describe("Management plan including medications, tests, follow-up"),
  planConfidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
});

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.2,
  openAIApiKey: env.OPENAI_API_KEY,
});

const structuredModelExtract = model.withStructuredOutput(ExtractedDataSchema, {
  name: "extract_clinical_data",
});

const structuredModelSoap = model.withStructuredOutput(SoapWithConfidenceSchema, {
  name: "generate_soap_note",
});

const extractionPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a clinical data extraction assistant for Indian healthcare settings.
Extract structured clinical information from doctor-patient consultation transcripts.
Be thorough but conservative - only extract what is clearly stated.
Context: India, primary care setting, common tropical and lifestyle diseases.`,
  ],
  [
    "human",
    `Patient Context:
- Name: {patientName}
- Age: {patientAge}
- Gender: {patientGender}

Consultation Transcript:
{transcript}

Extract all clinical data from this transcript.`,
  ],
]);

const soapPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert clinical documentation assistant trained in Indian healthcare.
Generate a structured SOAP note from the extracted clinical data.
Use clear medical terminology appropriate for Indian primary care.
For each section, assess your confidence (0-100):
- >90: Very clear information in transcript
- 75-90: Reasonable inference from available data
- 50-75: Some uncertainty, limited information
- <50: Significant gaps, needs clarification

When prior consultation history is available, use it to:
- Identify chronic or recurring conditions
- Note medication history and previous treatment responses
- Flag if symptoms are worsening compared to prior visits
- Avoid repeating treatments that were previously ineffective

Keep notes concise but complete. Use standard medical abbreviations where appropriate.`,
  ],
  [
    "human",
    `Patient: {patientName}, {patientAge}Y, {patientGender}

Prior Medical History:
{patientHistory}

Extracted Clinical Data:
{extractedData}

Chief Complaint: {chiefComplaint}

Generate a complete SOAP note with confidence scores for each section.`,
  ],
]);

function identifyHitlFlags(
  soapNote: SoapNote & {
    subjectiveConfidence: number;
    objectiveConfidence: number;
    assessmentConfidence: number;
    planConfidence: number;
  }
): HitlFlag[] {
  const flags: HitlFlag[] = [];
  const CONFIDENCE_THRESHOLD = 75;

  if (soapNote.subjectiveConfidence < CONFIDENCE_THRESHOLD) {
    flags.push({
      section: "subjective",
      field: "subjective",
      reason: `Low confidence (${soapNote.subjectiveConfidence}%): Patient history may be incomplete. Please verify symptoms and duration.`,
      resolved: false,
    });
  }

  if (soapNote.objectiveConfidence < CONFIDENCE_THRESHOLD) {
    flags.push({
      section: "objective",
      field: "objective",
      reason: `Low confidence (${soapNote.objectiveConfidence}%): Objective findings are limited or unclear. Please verify or add examination findings.`,
      resolved: false,
    });
  }

  if (soapNote.assessmentConfidence < CONFIDENCE_THRESHOLD) {
    flags.push({
      section: "assessment",
      field: "assessment",
      reason: `Low confidence (${soapNote.assessmentConfidence}%): Clinical assessment needs review. Differential diagnoses may be incomplete.`,
      resolved: false,
    });
  }

  if (soapNote.planConfidence < CONFIDENCE_THRESHOLD) {
    flags.push({
      section: "plan",
      field: "plan",
      reason: `Low confidence (${soapNote.planConfidence}%): Treatment plan needs verification. Medications, dosages, or follow-up instructions may need clarification.`,
      resolved: false,
    });
  }

  return flags;
}

export interface TranscriptToSoapResult {
  soapNote: SoapNote;
  extractedData: ExtractedClinicalData;
  hitlFlags: HitlFlag[];
  confidenceScores: {
    subjective: number;
    objective: number;
    assessment: number;
    plan: number;
  };
}

function formatPatientHistory(history: PatientHistoryEntry[]): string {
  if (!history || history.length === 0) {
    return "No prior consultation history on record.";
  }
  return history
    .map(
      (h, i) =>
        `Visit ${i + 1} (${h.date}):\n` +
        `  Assessment: ${h.assessment}\n` +
        `  Plan: ${h.plan}\n` +
        `  Medications: ${h.drugs.length > 0 ? h.drugs.join(", ") : "None"}\n` +
        `  Diagnoses: ${h.diagnoses.length > 0 ? h.diagnoses.join(", ") : "Not recorded"}`
    )
    .join("\n\n");
}

export async function transcriptToSoap(
  rawTranscript: string,
  patientContext: PatientContext
): Promise<TranscriptToSoapResult> {
  // Step 1: Extract structured data
  const extractionChain = extractionPrompt.pipe(structuredModelExtract);
  const extractedData = await extractionChain.invoke({
    transcript: rawTranscript,
    patientName: patientContext.name,
    patientAge: patientContext.age.toString(),
    patientGender: patientContext.gender,
  });

  // Step 2: Generate SOAP note with confidence (inject prior history as context)
  const patientHistory = formatPatientHistory(patientContext.priorHistory ?? []);
  const soapChain = soapPrompt.pipe(structuredModelSoap);
  const soapWithConfidence = await soapChain.invoke({
    patientName: patientContext.name,
    patientAge: patientContext.age.toString(),
    patientGender: patientContext.gender,
    extractedData: JSON.stringify(extractedData, null, 2),
    chiefComplaint: patientContext.chiefComplaint ?? extractedData.complaints.join(", "),
    patientHistory,
  });

  const soapNote: SoapNote = {
    subjective: soapWithConfidence.subjective,
    objective: soapWithConfidence.objective,
    assessment: soapWithConfidence.assessment,
    plan: soapWithConfidence.plan,
  };

  const soapWithScores = {
    ...soapNote,
    subjectiveConfidence: soapWithConfidence.subjectiveConfidence,
    objectiveConfidence: soapWithConfidence.objectiveConfidence,
    assessmentConfidence: soapWithConfidence.assessmentConfidence,
    planConfidence: soapWithConfidence.planConfidence,
  };

  // Step 3: Identify HITL flags
  const hitlFlags = identifyHitlFlags(soapWithScores);

  return {
    soapNote,
    extractedData,
    hitlFlags,
    confidenceScores: {
      subjective: soapWithConfidence.subjectiveConfidence,
      objective: soapWithConfidence.objectiveConfidence,
      assessment: soapWithConfidence.assessmentConfidence,
      plan: soapWithConfidence.planConfidence,
    },
  };
}
