import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDoctorByClerkId, getPatientsByDoctor } from "@workspace/db";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = await getDoctorByClerkId(userId);
  if (!doctor) return NextResponse.json({ error: "Doctor profile not found" }, { status: 403 });

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const patients = await getPatientsByDoctor(doctor.id, search);

  return NextResponse.json({ patients });
}
