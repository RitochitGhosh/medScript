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
  /** Tavily AI summary synthesised from live web search. */
  summary?: string;
}

export async function hospitalSearch(
  specialty: string,
  city: string,
  lat: number,
  lng: number
): Promise<HospitalSearchResult> {
  // Two complementary Tavily queries:
  // 1. Location + specialty to find real nearby hospitals
  // 2. Broader query to fill in gaps
  const primaryQuery = `${specialty} hospital near ${city} address contact phone referral India`;
  const secondaryQuery = `best ${specialty} hospitals ${city} India government private AIIMS`;

  let searchContent = "";
  let tavilySummary: string | undefined;

  try {
    const [primary, secondary] = await Promise.all([
      tavilySearch(primaryQuery, 5),
      tavilySearch(secondaryQuery, 3),
    ]);

    // Prefer the answer from the more specific primary query
    tavilySummary = primary.answer ?? secondary.answer;

    const allResults = [...primary.results, ...secondary.results]
      // Deduplicate by URL
      .filter((r, i, arr) => arr.findIndex((x) => x.url === r.url) === i)
      .slice(0, 8);

    searchContent = allResults
      .map((r) => `${r.title}\n${r.content}\nURL: ${r.url}`)
      .join("\n\n---\n\n");
  } catch (error) {
    console.warn("Tavily hospital search failed:", error);
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

  // Extract structured hospital list with LLM
  const chain = hospitalPrompt.pipe(structuredModel);
  const result = await chain.invoke({
    specialty,
    city,
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
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
    summary: tavilySummary,
  };
}
