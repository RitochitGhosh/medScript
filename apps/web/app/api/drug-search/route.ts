/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/drug-search
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { drugEnrichment } from "@workspace/langchain";
import { z } from "zod";

const RequestSchema = z.object({
  drugs: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
