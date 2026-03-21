import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { DiagnosisSuggestion } from "@workspace/types";
import { tavilySearch } from "../tavily";

const DiagnosisSchema = z.object({
  diagnoses: z.array(
    z.object({
      diagnosis: z.string().describe("Diagnosis name (use standard medical terminology)"),
      confidence: z.number().min(0).max(100).describe("Confidence percentage 0-100"),
      reasoning: z.string().describe("Clinical reasoning supporting this diagnosis"),
      recommendedTests: z
        .array(z.string())
        .describe("Recommended diagnostic tests (use tests available in India)"),
      redFlags: z.array(z.string()).describe("Red flags requiring immediate attention"),
    })
  ).max(3).describe("Top 3 differential diagnoses"),
});

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.1,
  openAIApiKey: process.env["OPENAI_API_KEY"],
});

const structuredModel = model.withStructuredOutput(DiagnosisSchema, {
  name: "suggest_diagnoses",
});

const diagnosisPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert clinical decision support system for primary care in India.
Generate differential diagnoses based on patient symptoms and clinical context.

Consider:
- Common Indian diseases: tropical infections (dengue, malaria, typhoid, leptospirosis), TB, lifestyle diseases
- Available diagnostic resources in Indian primary care settings
- Cost-effective investigations first
- Local disease prevalence and seasonal patterns

Use the RAG knowledge base context provided to inform your suggestions.
Rank diagnoses by likelihood based on clinical presentation.`,
  ],
  [
    "human",
    `Patient Symptoms: {symptoms}

Clinical Data:
{extractedData}

Medical Knowledge Base Context:
{ragContext}

Generate the top 3 differential diagnoses with clinical reasoning.
Focus on diagnoses most relevant to the Indian primary care context.`,
  ],
]);

export interface DiagnosisSuggestionResult {
  diagnoses: DiagnosisSuggestion[];
}

export async function diagnosisSuggestion(
  symptoms: string[],
  extractedData: object,
  ragContext: string
): Promise<DiagnosisSuggestionResult> {
  // Step 1: Generate diagnoses using LLM
  const chain = diagnosisPrompt.pipe(structuredModel);
  const result = await chain.invoke({
    symptoms: symptoms.join(", "),
    extractedData: JSON.stringify(extractedData, null, 2),
    ragContext,
  });

  // Step 2: Enrich with live treatment guidelines via Tavily
  const enrichedDiagnoses: DiagnosisSuggestion[] = await Promise.all(
    result.diagnoses.map(async (diag) => {
      let guidelineUrl: string | undefined;
      let guidelineSummary: string | undefined;

      try {
        const searchResult = await tavilySearch(
          `latest treatment guidelines ${diag.diagnosis} India 2025`
        );
        if (searchResult.results.length > 0) {
          const topResult = searchResult.results[0];
          guidelineUrl = topResult?.url;
          guidelineSummary = topResult?.content?.substring(0, 500);
        }
      } catch (error) {
        console.warn(`Tavily search failed for ${diag.diagnosis}:`, error);
        // Continue without guideline - graceful degradation
      }

      return {
        ...diag,
        guidelineUrl,
        guidelineSummary,
      };
    })
  );

  return { diagnoses: enrichedDiagnoses };
}
