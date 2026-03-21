/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/drug-search
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { drugEnrichment } from "@workspace/langchain";
import { z } from "zod";

const RequestSchema = z.object({
  drugs: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as unknown;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { drugs } = parsed.data;
    const result = await drugEnrichment(drugs);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Drug search error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Drug search failed",
        code: "DRUG_SEARCH_FAILED",
      },
      { status: 500 }
    );
  }
}
