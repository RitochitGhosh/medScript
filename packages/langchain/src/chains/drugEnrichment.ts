import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { PrescribedDrug, DrugInteraction } from "@workspace/types";
import { tavilySearch } from "../tavily";
import { env } from "../env";
import { ragRetrieval } from "./ragRetrieval";

const DrugEnrichmentSchema = z.object({
  drugs: z.array(
    z.object({
      name: z.string(),
      brandName: z.string().describe("Most common Indian brand name"),
      dosage: z.string().describe("Standard dosage"),
      frequency: z.string().describe("Frequency e.g., OD, BD, TDS, QID"),
      duration: z.string().describe("Duration of treatment"),
      price: z.string().nullable().describe("Approximate price in Indian Rupees, or null if unknown"),
      availability: z.string().nullable().describe("Common or Rare in Indian pharmacies, or null if unknown"),
    })
  ),
});

const InteractionSchema = z.object({
  interactions: z.array(
    z.object({
      drug1: z.string(),
      drug2: z.string(),
      severity: z.enum(["mild", "moderate", "severe"]),
      description: z.string(),
    })
  ),
});

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
  openAIApiKey: env.OPENAI_API_KEY,
});

const enrichDrugPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a pharmacist assistant for India. Provide accurate drug information for Indian healthcare settings.
Use Indian brand names, INR pricing, and standard Indian dosing guidelines.
If price/availability data is provided from search, use that; otherwise provide typical Indian market data.`,
  ],
  [
    "human",
    `Drug name(s): {drugNames}

Search data (may be empty): {searchData}

Provide complete drug information for each drug in Indian context.`,
  ],
]);

const interactionPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a clinical pharmacologist. Identify drug interactions between prescribed medications.
Focus on clinically significant interactions. Use standard severity classifications.
RAG Knowledge Base Context:
{ragContext}`,
  ],
  [
    "human",
    `Prescribed drugs: {drugList}

Identify all clinically significant drug interactions between these drugs.
Return empty array if no significant interactions found.`,
  ],
]);

const structuredEnrichModel = model.withStructuredOutput(DrugEnrichmentSchema, {
  name: "enrich_drugs",
});

const structuredInteractionModel = model.withStructuredOutput(InteractionSchema, {
  name: "check_interactions",
});

export interface DrugEnrichmentResult {
  enrichedDrugs: PrescribedDrug[];
  interactions: DrugInteraction[];
}

export async function drugEnrichment(drugs: string[]): Promise<DrugEnrichmentResult> {
  if (drugs.length === 0) {
    return { enrichedDrugs: [], interactions: [] };
  }

  // Step 1: Check RAG for each drug first; fall back to Tavily only if not found
  const searchDataMap: Record<string, string> = {};
  await Promise.all(
    drugs.map(async (drug) => {
      try {
        const ragResult = await ragRetrieval(`${drug} dosage price India pharmacy`, 3, "drug");
        if (ragResult.isRelevant) {
          searchDataMap[drug] = ragResult.chunks.map((c) => c.content).join("\n").substring(0, 500);
          return;
        }
      } catch {
        // fall through to Tavily
      }

      try {
        const result = await tavilySearch(`${drug} price India pharmacy 2025`);
        if (result.results.length > 0) {
          searchDataMap[drug] = result.results
            .slice(0, 2)
            .map((r) => r.content)
            .join("\n")
            .substring(0, 500);
        }
      } catch (error) {
        console.warn(`Tavily search failed for drug ${drug}:`, error);
        searchDataMap[drug] = "";
      }
    })
  );

  // Step 2: Enrich drug info with LLM
  const enrichChain = enrichDrugPrompt.pipe(structuredEnrichModel);
  const enriched = await enrichChain.invoke({
    drugNames: drugs.join(", "),
    searchData: JSON.stringify(searchDataMap, null, 2),
  });

  // Step 3: RAG search for drug interactions
  let ragContext = "No specific interaction data found.";
  if (drugs.length > 1) {
    try {
      const ragResult = await ragRetrieval(
        `drug interactions ${drugs.join(" ")}`,
        3,
        "interaction"
      );
      if (ragResult.chunks.length > 0) {
        ragContext = ragResult.chunks.map((c) => c.content).join("\n\n");
      }
    } catch (error) {
      console.warn("RAG retrieval failed for drug interactions:", error);
    }
  }

  // Step 4: Check interactions with LLM
  let interactions: DrugInteraction[] = [];
  if (drugs.length > 1) {
    try {
      const interactionChain = interactionPrompt.pipe(structuredInteractionModel);
      const interactionResult = await interactionChain.invoke({
        drugList: drugs.join(", "),
        ragContext,
      });
      interactions = interactionResult.interactions;
    } catch (error) {
      console.warn("Drug interaction check failed:", error);
    }
  }

  return {
    enrichedDrugs: enriched.drugs.map((d) => ({
      name: d.name,
      brandName: d.brandName,
      dosage: d.dosage,
      frequency: d.frequency,
      duration: d.duration,
      price: d.price ?? undefined,
      availability: d.availability ?? undefined,
    })),
    interactions,
  };
}
