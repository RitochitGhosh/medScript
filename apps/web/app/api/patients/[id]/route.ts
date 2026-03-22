import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPatientById, getPatientByCode } from "@workspace/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Prefer short patient code lookup; fall back to UUID for internal links.
    const patient = UUID_RE.test(id)
      ? await getPatientById(id)
      : await getPatientByCode(id);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(patient);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup failed" },
      { status: 500 }
    );
  }
}
