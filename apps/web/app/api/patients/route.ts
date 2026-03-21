import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createPatient, searchPatients } from "@workspace/db";
import { z } from "zod";

const CreatePatientSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(1).max(150),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = request.nextUrl.searchParams.get("search") ?? "";
  if (!query.trim()) {
    return NextResponse.json([]);
  }

  const patients = await searchPatients(query);
  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as unknown;
    const parsed = CreatePatientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const patient = await createPatient(parsed.data);
    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create patient" },
      { status: 500 }
    );
  }
}
