/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/generate-pdf
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConsultationById, approveConsultation } from "@workspace/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { PrescriptionPDF } from "@/components/pdf-preview/PrescriptionPDF";
import { z } from "zod";

const RequestSchema = z.object({
  consultationId: z.string().min(1),
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

    const { consultationId } = parsed.data;

    // Fetch consultation
    const consultation = await getConsultationById(consultationId);
    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // HITL approval gate — non-negotiable
    const unresolvedFlags = consultation.hitlFlags.filter((f) => !f.resolved);
    if (unresolvedFlags.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot generate PDF: ${unresolvedFlags.length} HITL flag(s) unresolved`,
          code: "HITL_UNRESOLVED",
        },
        { status: 422 }
      );
    }

    if (consultation.status !== "approved" && consultation.status !== "finalized") {
      return NextResponse.json(
        {
          error: "Consultation must be approved before generating PDF",
          code: "NOT_APPROVED",
        },
        { status: 422 }
      );
    }

    // Generate PDF
    const pdfElement = createElement(PrescriptionPDF, { consultation }) as ReactElement<DocumentProps>;
    const pdfBuffer = await renderToBuffer(pdfElement);

    // Mark as finalized
    await approveConsultation(consultationId);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="prescription-${consultationId}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF generation failed",
        code: "PDF_GENERATION_FAILED",
      },
      { status: 500 }
    );
  }
}
