/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/consultation/[id]/approve
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  updateHitlFlags,
  updateSoapNote,
  updateDrugs,
  approveConsultation,
  getConsultationById,
  getDoctorByClerkId,
} from "@workspace/db";
import { z } from "zod";
import type { HitlFlag, SoapNote, PrescribedDrug } from "@workspace/types";

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
  prescribedDrugs: z.array(
    z.object({
      name: z.string(),
      brandName: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      duration: z.string(),
      price: z.string().optional(),
      availability: z.string().optional(),
    })
  ).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;

    // Ownership check: only the doctor who created it can approve
    const doctor = await getDoctorByClerkId(userId);
    if (!doctor) {
      return NextResponse.json({ error: "Doctor profile not found", code: "DOCTOR_NOT_FOUND" }, { status: 403 });
    }

    const consultation = await getConsultationById(id);
    if (!consultation) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }
    if (consultation.doctorId !== doctor.id) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = (await request.json()) as unknown;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { hitlFlags, soapNote, prescribedDrugs } = parsed.data;

    const unresolved = hitlFlags.filter((f) => !f.resolved);
    if (unresolved.length > 0) {
      return NextResponse.json(
        { error: `${unresolved.length} HITL flag(s) still unresolved`, code: "HITL_UNRESOLVED" },
        { status: 422 }
      );
    }

    const updates: Promise<unknown>[] = [
      updateSoapNote(id, soapNote as SoapNote),
      updateHitlFlags(id, hitlFlags as HitlFlag[]),
    ];
    if (prescribedDrugs) {
      updates.push(updateDrugs(id, prescribedDrugs as PrescribedDrug[]));
    }
    await Promise.all(updates);

    await approveConsultation(id);

    return NextResponse.json({ success: true, status: "approved" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Approval failed", code: "APPROVAL_FAILED" },
      { status: 500 }
    );
  }
}
