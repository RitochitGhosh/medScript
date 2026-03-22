import { eq, ilike, sql } from "drizzle-orm";
import { db } from "./drizzle/client";
import { patients } from "./drizzle/schema";
import { getUserByClerkId } from "./pg-users";
import type { PatientProfile, PatientGender } from "@workspace/types";

// ---------------------------------------------------------------------------
// Patient code generation
// ---------------------------------------------------------------------------

/** Characters used in patient codes — excludes visually ambiguous chars (0,O,1,I). */
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_CHARSET[Math.floor(Math.random() * CODE_CHARSET.length)]
  ).join("");
}

/** Generates a unique 6-char patient code, retrying on collision. */
async function generateUniquePatientCode(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = randomCode();
    const existing = await db.query.patients.findFirst({
      where: eq(patients.patientCode, code),
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique patient code after 10 attempts");
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function toPatientProfile(row: typeof patients.$inferSelect): PatientProfile {
  return {
    id: row.id,
    patientCode: row.patientCode,
    userId: row.userId,
    name: row.name,
    age: row.age,
    gender: row.gender as PatientGender,
    phone: row.phone,
    bloodGroup: row.bloodGroup,
    allergies: row.allergies ?? [],
    isCritical: row.isCritical,
    criticalNote: row.criticalNote,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function createPatient(data: {
  name: string;
  age: number;
  gender: PatientGender;
  phone?: string;
  bloodGroup?: string;
  allergies?: string[];
  userId?: string;
}): Promise<PatientProfile> {
  const patientCode = await generateUniquePatientCode();
  const [row] = await db
    .insert(patients)
    .values({
      patientCode,
      name: data.name,
      age: data.age,
      gender: data.gender,
      phone: data.phone ?? null,
      bloodGroup: data.bloodGroup ?? null,
      allergies: data.allergies ?? [],
      userId: data.userId ?? null,
      isCritical: false,
      criticalNote: null,
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

/** Look up a patient by their short 6-char code. Used by the consult page lookup. */
export async function getPatientByCode(code: string): Promise<PatientProfile | null> {
  const row = await db.query.patients.findFirst({
    where: eq(patients.patientCode, code.toUpperCase()),
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

/** All distinct patients a doctor has ever treated, scoped to that doctor's consultations */
export async function getPatientsByDoctor(
  doctorId: string,
  searchQuery?: string
): Promise<(PatientProfile & { lastSeenAt: Date; totalVisits: number })[]> {
  // Build raw SQL for a join with aggregation
  const searchFilter = searchQuery
    ? sql`AND p.name ILIKE ${"%" + searchQuery + "%"}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      p.id,
      p.patient_code,
      p.user_id,
      p.name,
      p.age,
      p.gender,
      p.phone,
      p.blood_group,
      p.allergies,
      p.is_critical,
      p.critical_note,
      p.created_at,
      p.updated_at,
      MAX(c.created_at) AS last_seen_at,
      COUNT(c.id)::int AS total_visits
    FROM patients p
    INNER JOIN consultations c ON c.patient_id = p.id
    WHERE c.doctor_id = ${doctorId}
    ${searchFilter}
    GROUP BY p.id
    ORDER BY MAX(c.created_at) DESC
  `);

  const rows = result.rows as unknown[];

  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row["id"] as string,
      patientCode: row["patient_code"] as string,
      userId: row["user_id"] as string | null,
      name: row["name"] as string,
      age: row["age"] as number,
      gender: row["gender"] as PatientGender,
      phone: row["phone"] as string | null,
      bloodGroup: row["blood_group"] as string | null,
      allergies: (row["allergies"] as string[]) ?? [],
      isCritical: (row["is_critical"] as boolean) ?? false,
      criticalNote: row["critical_note"] as string | null,
      createdAt: new Date(row["created_at"] as string),
      lastSeenAt: new Date(row["last_seen_at"] as string),
      totalVisits: (row["total_visits"] as number) ?? 0,
    };
  });
}

/** Toggle the critical/attention-required flag on a patient */
export async function setPatientCritical(
  patientId: string,
  isCritical: boolean,
  criticalNote?: string
): Promise<boolean> {
  const result = await db
    .update(patients)
    .set({
      isCritical,
      criticalNote: isCritical ? (criticalNote ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, patientId));
  return (result.rowCount ?? 0) > 0;
}
