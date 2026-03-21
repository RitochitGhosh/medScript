import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { Hospital } from "@workspace/types";
import { tavilySearch } from "../tavily";
import { env } from "../env";

const HospitalListSchema = z.object({
  hospitals: z.array(
    z.object({
      name: z.string().describe("Hospital name"),
      address: z.string().describe("Full address including city"),
      specialty: z.string().describe("Main specialty or department"),
      contact: z.string().nullable().describe("Phone number or website, or null if unavailable"),
      distance: z.string().nullable().describe("Approximate distance from patient location, or null if unknown"),
    })
  ).max(5),
});

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
  openAIApiKey: env.OPENAI_API_KEY,
});

const structuredModel = model.withStructuredOutput(HospitalListSchema, {
  name: "list_hospitals",
});

const hospitalPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a healthcare referral assistant for India.
Extract structured hospital information from search results.
Focus on reputable hospitals with the required specialty.
Include both government (AIIMS, ESI, district hospitals) and private hospitals.
Prefer hospitals that are accessible to patients in underserved areas.`,
  ],
  [
    "human",
    `Patient location: {city} (lat: {lat}, lng: {lng})
Required specialty: {specialty}

Search results:
{searchResults}

Extract the top 5 hospitals with contact information. Include distance if mentioned.`,
  ],
]);

export interface HospitalSearchResult {
  hospitals: Hospital[];
}

export async function hospitalSearch(
  specialty: string,
  city: string,
  lat: number,
  lng: number
): Promise<HospitalSearchResult> {
  // Search Tavily for hospitals
  let searchContent = "";
  try {
    const result = await tavilySearch(
      `best ${specialty} hospitals near ${city} India referral government private`
    );
    searchContent = result.results
      .slice(0, 5)
      .map((r) => `${r.title}\n${r.content}\nURL: ${r.url}`)
      .join("\n\n---\n\n");
  } catch (error) {
    console.warn("Tavily hospital search failed:", error);
    // Return fallback data
    return {
      hospitals: [
        {
          name: `District ${specialty} Hospital, ${city}`,
          address: `District Hospital, ${city}`,
          specialty,
          contact: "Contact local district health office",
          distance: "Nearest district hospital",
        },
      ],
    };
  }

  // Parse with LLM
  const chain = hospitalPrompt.pipe(structuredModel);
  const result = await chain.invoke({
    specialty,
    city,
    lat: lat.toString(),
    lng: lng.toString(),
    searchResults: searchContent || "No search results available.",
  });

  return {
    hospitals: result.hospitals.map((h) => ({
      name: h.name,
      address: h.address,
      specialty: h.specialty,
      contact: h.contact ?? undefined,
      distance: h.distance ?? undefined,
    })),
  };
}
