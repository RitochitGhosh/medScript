import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getDoctorByClerkId,
  getPatientById,
  getConsultationsByPatient,
} from "@workspace/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = await getDoctorByClerkId(userId);
  if (!doctor) return NextResponse.json({ error: "Doctor profile not found" }, { status: 403 });

  const { id } = await params;
  const [patient, consultations] = await Promise.all([
    getPatientById(id),
    getConsultationsByPatient(id, 50),
  ]);

  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  // Ensure this doctor has at least one consultation with this patient
  const hasRelationship = consultations.some((c) => c.doctorId === doctor.id);
  if (!hasRelationship) {
    return NextResponse.json({ error: "Patient not in your records" }, { status: 403 });
  }

  return NextResponse.json({ patient, consultations });
}
