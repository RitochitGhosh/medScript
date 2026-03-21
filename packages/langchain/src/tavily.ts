import { env } from "./env";
const TAVILY_API_KEY = env.TAVILY_API_KEY;

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  results: TavilyResult[];
  answer?: string;
  query: string;
}

export class TavilyError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "TavilyError";
  }
}

export async function tavilySearch(
  query: string,
  maxResults: number = 5
): Promise<TavilySearchResponse> {
  if (!TAVILY_API_KEY) {
    throw new TavilyError("TAVILY_API_KEY is not configured", "NO_API_KEY");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new TavilyError(
      `Tavily search failed (${response.status}): ${errorText}`,
      "SEARCH_FAILED"
    );
  }

  const data = (await response.json()) as {
    results: TavilyResult[];
    answer?: string;
    query: string;
  };

  return {
    results: data.results ?? [],
    answer: data.answer,
    query: data.query ?? query,
  };
}
