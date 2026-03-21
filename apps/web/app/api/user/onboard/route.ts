import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { upsertUser } from "@workspace/db";
import { createDoctorProfile } from "@workspace/db";
import { createPatient } from "@workspace/db";
import { z } from "zod";

const DoctorSchema = z.object({
  role: z.literal("doctor"),
  specialization: z.string().min(1).optional(),
  clinicName: z.string().optional(),
  licenseNumber: z.string().optional(),
});

const PatientSchema = z.object({
  role: z.literal("patient"),
  name: z.string().min(1),
  age: z.number().int().min(1).max(150),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().optional(),
  bloodGroup: z.string().optional(),
});

const RequestSchema = z.discriminatedUnion("role", [DoctorSchema, PatientSchema]);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = (await request.json()) as unknown;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const email =
      clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = clerkUser.fullName ?? clerkUser.firstName ?? email;

    // Create/update user row in PostgreSQL
    const user = await upsertUser(userId, email, name, parsed.data.role);

    if (parsed.data.role === "doctor") {
      await createDoctorProfile(user.id, {
        specialization: parsed.data.specialization,
        clinicName: parsed.data.clinicName,
        licenseNumber: parsed.data.licenseNumber,
      });
    } else {
      await createPatient({
        name: parsed.data.name,
        age: parsed.data.age,
        gender: parsed.data.gender,
        phone: parsed.data.phone,
        bloodGroup: parsed.data.bloodGroup,
        userId: user.id,
      });
    }

    // Stamp role onto Clerk publicMetadata so middleware can read it from JWT claims
    // Requires session token customization in Clerk dashboard:
    // Configure → Sessions → Customize session token → add { "metadata": "{{user.public_metadata}}" }
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: parsed.data.role },
    });

    return NextResponse.json({ success: true, role: parsed.data.role });
  } catch (error) {
    console.error("Onboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding failed" },
      { status: 500 }
    );
  }
}
