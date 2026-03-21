import { eq, ilike } from "drizzle-orm";
import { db } from "./drizzle/client";
import { patients } from "./drizzle/schema";
import { getUserByClerkId } from "./pg-users";
import type { PatientProfile, PatientGender } from "@workspace/types";

function toPatientProfile(row: typeof patients.$inferSelect): PatientProfile {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    age: row.age,
    gender: row.gender as PatientGender,
    phone: row.phone,
    bloodGroup: row.bloodGroup,
    allergies: row.allergies ?? [],
    createdAt: row.createdAt,
  };
}

export async function createPatient(data: {
  name: string;
  age: number;
  gender: PatientGender;
  phone?: string;
  bloodGroup?: string;
  allergies?: string[];
  userId?: string;
}): Promise<PatientProfile> {
  const [row] = await db
    .insert(patients)
    .values({
      name: data.name,
      age: data.age,
      gender: data.gender,
      phone: data.phone ?? null,
      bloodGroup: data.bloodGroup ?? null,
      allergies: data.allergies ?? [],
      userId: data.userId ?? null,
    })
    .returning();
  return toPatientProfile(row!);
}

export async function getPatientById(patientId: string): Promise<PatientProfile | null> {
  const row = await db.query.patients.findFirst({
    where: eq(patients.id, patientId),
  });
  return row ? toPatientProfile(row) : null;
}

export async function getPatientByUserId(userId: string): Promise<PatientProfile | null> {
  const row = await db.query.patients.findFirst({
    where: eq(patients.userId, userId),
  });
  return row ? toPatientProfile(row) : null;
}

export async function getPatientByClerkId(clerkUserId: string): Promise<PatientProfile | null> {
  const user = await getUserByClerkId(clerkUserId);
  if (!user) return null;
  return getPatientByUserId(user.id);
}

export async function linkPatientAccount(patientId: string, userId: string): Promise<void> {
  await db.update(patients).set({ userId }).where(eq(patients.id, patientId));
}

export async function searchPatients(query: string, limit = 10): Promise<PatientProfile[]> {
  const rows = await db.query.patients.findMany({
    where: ilike(patients.name, `%${query}%`),
    limit,
  });
  return rows.map(toPatientProfile);
}
