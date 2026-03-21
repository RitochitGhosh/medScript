/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/hospital-search
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hospitalSearch } from "@workspace/langchain";
import { z } from "zod";

const RequestSchema = z.object({
  specialty: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  city: z.string().min(1),
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

    const { specialty, lat, lng, city } = parsed.data;
    const result = await hospitalSearch(specialty, city, lat, lng);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Hospital search error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Hospital search failed",
        code: "HOSPITAL_SEARCH_FAILED",
      },
      { status: 500 }
    );
  }
}
