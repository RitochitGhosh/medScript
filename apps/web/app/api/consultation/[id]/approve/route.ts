/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/consultation/[id]/approve
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateHitlFlags, updateSoapNote, approveConsultation } from "@workspace/db";
import { z } from "zod";
import type { HitlFlag, SoapNote } from "@workspace/types";

const RequestSchema = z.object({
  hitlFlags: z.array(
    z.object({
      section: z.enum(["subjective", "objective", "assessment", "plan", "drug", "diagnosis"]),
      field: z.string(),
      reason: z.string(),
      resolved: z.boolean(),
      doctorEdit: z.string().optional(),
    })
  ),
  soapNote: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
});

export async function POST(
  request: NextRequest,
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
    const body = (await request.json()) as unknown;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { hitlFlags, soapNote } = parsed.data;

    // Check all flags resolved
    const unresolved = hitlFlags.filter((f) => !f.resolved);
    if (unresolved.length > 0) {
      return NextResponse.json(
        {
          error: `${unresolved.length} HITL flag(s) still unresolved`,
          code: "HITL_UNRESOLVED",
        },
        { status: 422 }
      );
    }

    // Save SOAP note edits and resolved flags
    await Promise.all([
      updateSoapNote(id, soapNote as SoapNote),
      updateHitlFlags(id, hitlFlags as HitlFlag[]),
    ]);

    // Approve consultation
    await approveConsultation(id);

    return NextResponse.json({ success: true, status: "approved" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Approval failed",
        code: "APPROVAL_FAILED",
      },
      { status: 500 }
    );
  }
}
