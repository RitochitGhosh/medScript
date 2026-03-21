/**
 * REQUESTLY ENDPOINT
 * Method: GET
 * Path: /api/consultation/[id]
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConsultationById } from "@workspace/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const consultation = await getConsultationById(id);
    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(consultation);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch consultation",
        code: "FETCH_FAILED",
      },
      { status: 500 }
    );
  }
}
