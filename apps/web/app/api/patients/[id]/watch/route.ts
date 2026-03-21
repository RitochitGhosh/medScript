import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getDoctorByClerkId, setPatientCritical, getPatientById, getConsultationsByPatient } from "@workspace/db";

const WatchSchema = z.object({
  isCritical: z.boolean(),
  criticalNote: z.string().max(300).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = await getDoctorByClerkId(userId);
  if (!doctor) return NextResponse.json({ error: "Doctor profile not found" }, { status: 403 });

  const { id } = await params;

  // Ensure the doctor has treated this patient
  const consultations = await getConsultationsByPatient(id, 1);
  const isDoctorasPatient = consultations.some((c) => c.doctorId === doctor.id);
  if (!isDoctorasPatient) {
    return NextResponse.json({ error: "Patient not found in your records" }, { status: 404 });
  }

  const body = (await request.json()) as unknown;
  const parsed = WatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  await setPatientCritical(id, parsed.data.isCritical, parsed.data.criticalNote);
  const updated = await getPatientById(id);
  return NextResponse.json({ patient: updated });
}
