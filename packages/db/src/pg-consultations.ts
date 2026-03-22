import { eq, and, gte, count, sql } from "drizzle-orm";
import { db } from "./drizzle/client";
import { consultations } from "./drizzle/schema";
import { encrypt, decrypt, encryptJSON, decryptJSON } from "./crypto";
import type {
  Consultation,
  ConsultationStatus,
  SoapNote,
  DiagnosisSuggestion,
  PrescribedDrug,
  HitlFlag,
  AuditLogEntry,
  ReferralHospital,
  Geolocation,
  PatientGender,
} from "@workspace/types";

// ---------------------------------------------------------------------------
// Row mapper — decrypts all sensitive fields
// ---------------------------------------------------------------------------

function toConsultation(row: typeof consultations.$inferSelect): Consultation {
  return {
    id: row.id,
    doctorId: row.doctorId,
    patientId: row.patientId,
    patientName: decrypt(row.patientName),
    patientAge: row.patientAge,
    patientGender: row.patientGender as PatientGender,
    rawTranscript: decrypt(row.rawTranscript),
    soapNote: decryptJSON<SoapNote>(row.soapNote),
    diagnosisSuggestions: decryptJSON<DiagnosisSuggestion[]>(row.diagnosisSuggestions),
    prescribedDrugs: decryptJSON<PrescribedDrug[]>(row.prescribedDrugs),
    hitlFlags: (row.hitlFlags as HitlFlag[]) ?? [],
    auditLog: decryptJSON<AuditLogEntry[]>(row.auditLog),
    referralHospital: row.referralHospital
      ? decryptJSON<ReferralHospital>(row.referralHospital)
      : undefined,
    geolocation: row.geolocation as Geolocation | undefined,
    status: row.status as ConsultationStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createConsultation(data: {
  doctorId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: PatientGender;
  rawTranscript: string;
  soapNote: SoapNote;
  diagnosisSuggestions?: DiagnosisSuggestion[];
  prescribedDrugs?: PrescribedDrug[];
  hitlFlags?: HitlFlag[];
  auditLog?: AuditLogEntry[];
  status?: ConsultationStatus;
  geolocation?: Geolocation;
}): Promise<Consultation> {
  const [row] = await db
    .insert(consultations)
    .values({
      doctorId: data.doctorId,
      patientId: data.patientId,
      patientName: encrypt(data.patientName),
      patientAge: data.patientAge,
      patientGender: data.patientGender,
      rawTranscript: encrypt(data.rawTranscript),
      soapNote: encryptJSON(data.soapNote),
      diagnosisSuggestions: encryptJSON(data.diagnosisSuggestions ?? []),
      prescribedDrugs: encryptJSON(data.prescribedDrugs ?? []),
      hitlFlags: data.hitlFlags ?? [],
      auditLog: encryptJSON(data.auditLog ?? []),
      status: data.status ?? "draft",
      geolocation: data.geolocation ?? null,
    })
    .returning();

  return toConsultation(row!);
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus
): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ status, updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function updateSoapNote(id: string, soapNote: SoapNote): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ soapNote: encryptJSON(soapNote), updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function updateDiagnoses(
  id: string,
  diagnoses: DiagnosisSuggestion[]
): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ diagnosisSuggestions: encryptJSON(diagnoses), updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function updateDrugs(id: string, drugs: PrescribedDrug[]): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ prescribedDrugs: encryptJSON(drugs), updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function updateReferralHospital(
  id: string,
  hospital: ReferralHospital
): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ referralHospital: encryptJSON(hospital), updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function updateHitlFlags(id: string, hitlFlags: HitlFlag[]): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ hitlFlags, updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function appendAuditLog(id: string, entry: AuditLogEntry): Promise<boolean> {
  // Fetch-modify-write: decrypt existing log, append, re-encrypt
  const row = await db.query.consultations.findFirst({
    where: eq(consultations.id, id),
  });
  if (!row) return false;

  const existing = row.auditLog ? decryptJSON<AuditLogEntry[]>(row.auditLog) : [];
  const updated = [...existing, entry];

  const result = await db
    .update(consultations)
    .set({ auditLog: encryptJSON(updated), updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function approveConsultation(id: string): Promise<boolean> {
  const row = await db.query.consultations.findFirst({
    where: eq(consultations.id, id),
  });
  if (!row) return false;

  const flags = (row.hitlFlags as HitlFlag[]) ?? [];
  const unresolved = flags.filter((f) => !f.resolved);
  if (unresolved.length > 0) {
    throw new Error(
      `Cannot approve: ${unresolved.length} HITL flag(s) are unresolved`
    );
  }

  const result = await db
    .update(consultations)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getConsultationById(id: string): Promise<Consultation | null> {
  const row = await db.query.consultations.findFirst({
    where: eq(consultations.id, id),
  });
  return row ? toConsultation(row) : null;
}

export async function getConsultationsByDoctor(
  doctorId: string,
  limit = 20
): Promise<Consultation[]> {
  const rows = await db.query.consultations.findMany({
    where: eq(consultations.doctorId, doctorId),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
    limit,
  });
  return rows.map(toConsultation);
}

export async function getConsultationsByPatient(
  patientId: string,
  limit = 20
): Promise<Consultation[]> {
  const rows = await db.query.consultations.findMany({
    where: eq(consultations.patientId, patientId),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
    limit,
  });
  return rows.map(toConsultation);
}

export async function getConsultationStats(doctorId: string): Promise<{
  total: number;
  pendingReview: number;
  completedToday: number;
  approvedTotal: number;
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalResult, pendingResult, todayResult, approvedResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(consultations)
      .where(eq(consultations.doctorId, doctorId)),
    db
      .select({ count: count() })
      .from(consultations)
      .where(
        and(eq(consultations.doctorId, doctorId), eq(consultations.status, "in_review"))
      ),
    db
      .select({ count: count() })
      .from(consultations)
      .where(
        and(
          eq(consultations.doctorId, doctorId),
          sql`${consultations.status} IN ('approved', 'finalized')`,
          gte(consultations.updatedAt, todayStart)
        )
      ),
    db
      .select({ count: count() })
      .from(consultations)
      .where(
        and(
          eq(consultations.doctorId, doctorId),
          sql`${consultations.status} IN ('approved', 'finalized')`
        )
      ),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    pendingReview: pendingResult[0]?.count ?? 0,
    completedToday: todayResult[0]?.count ?? 0,
    approvedTotal: approvedResult[0]?.count ?? 0,
  };
}

/** Daily consultation counts for the activity heatmap (last N days) */
export async function getConsultationActivity(
  doctorId: string,
  days = 365
): Promise<{ date: string; count: number }[]> {
  const result = await db.execute(sql`
    SELECT
      DATE(created_at AT TIME ZONE 'UTC')::text AS date,
      COUNT(*)::int AS count
    FROM consultations
    WHERE doctor_id = ${doctorId}
      AND created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY DATE(created_at AT TIME ZONE 'UTC')
    ORDER BY date ASC
  `);
  return (result.rows as { date: string; count: number }[]);
}

/**
 * Patients with unresolved HITL flags (attention required).
 * hitlFlags is kept as JSONB so this SQL query remains functional.
 */
export async function getCriticalPatients(doctorId: string): Promise<
  {
    patientId: string;
    patientName: string;
    consultationId: string;
    unresolvedFlags: number;
    lastUpdated: Date;
  }[]
> {
  const result = await db.execute(sql`
    SELECT
      c.patient_id AS "patientId",
      c.patient_name AS "patientName",
      c.id AS "consultationId",
      (
        SELECT COUNT(*)::int
        FROM jsonb_array_elements(c.hitl_flags) AS f
        WHERE (f->>'resolved')::boolean = false
      ) AS "unresolvedFlags",
      c.updated_at AS "lastUpdated"
    FROM consultations c
    WHERE c.doctor_id = ${doctorId}
      AND c.status NOT IN ('finalized', 'approved')
      AND (
        SELECT COUNT(*)
        FROM jsonb_array_elements(c.hitl_flags) AS f
        WHERE (f->>'resolved')::boolean = false
      ) > 0
    ORDER BY "unresolvedFlags" DESC, c.updated_at DESC
    LIMIT 20
  `);

  return (result.rows as {
    patientId: string;
    patientName: string;
    consultationId: string;
    unresolvedFlags: number;
    lastUpdated: string;
  }[]).map((r) => ({
    patientId: r.patientId,
    patientName: decrypt(r.patientName),
    consultationId: r.consultationId,
    unresolvedFlags: r.unresolvedFlags,
    lastUpdated: new Date(r.lastUpdated),
  }));
}
