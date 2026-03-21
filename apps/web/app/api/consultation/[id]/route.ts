/**
 * REQUESTLY ENDPOINT
 * Method: GET
 * Path: /api/consultation/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConsultationById, getDoctorByClerkId, getPatientByClerkId } from "@workspace/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const consultation = await getConsultationById(id);
    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // RBAC: doctors see their own consultations; patients see consultations for their patientId
    const doctor = await getDoctorByClerkId(userId);
    if (doctor) {
      if (consultation.doctorId !== doctor.id) {
        return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
      }
      return NextResponse.json(consultation);
    }

    const patient = await getPatientByClerkId(userId);
    if (patient) {
      if (consultation.patientId !== patient.id) {
        return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
      }
      return NextResponse.json(consultation);
    }

    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch consultation", code: "FETCH_FAILED" },
      { status: 500 }
    );
  }
}
