import { eq, and, gte, count, sql } from "drizzle-orm";
import { db } from "./drizzle/client";
import { consultations } from "./drizzle/schema";
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

function toConsultation(row: typeof consultations.$inferSelect): Consultation {
  return {
    id: row.id,
    doctorId: row.doctorId,
    patientId: row.patientId,
    patientName: row.patientName,
    patientAge: row.patientAge,
    patientGender: row.patientGender as PatientGender,
    rawTranscript: row.rawTranscript,
    soapNote: row.soapNote as SoapNote,
    diagnosisSuggestions: (row.diagnosisSuggestions as DiagnosisSuggestion[]) ?? [],
    prescribedDrugs: (row.prescribedDrugs as PrescribedDrug[]) ?? [],
    hitlFlags: (row.hitlFlags as HitlFlag[]) ?? [],
    auditLog: (row.auditLog as AuditLogEntry[]) ?? [],
    referralHospital: row.referralHospital as ReferralHospital | undefined,
    geolocation: row.geolocation as Geolocation | undefined,
    status: row.status as ConsultationStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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
      patientName: data.patientName,
      patientAge: data.patientAge,
      patientGender: data.patientGender,
      rawTranscript: data.rawTranscript,
      soapNote: data.soapNote,
      diagnosisSuggestions: data.diagnosisSuggestions ?? [],
      prescribedDrugs: data.prescribedDrugs ?? [],
      hitlFlags: data.hitlFlags ?? [],
      auditLog: data.auditLog ?? [],
      status: data.status ?? "draft",
      geolocation: data.geolocation ?? null,
    })
    .returning();
  return toConsultation(row!);
}

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
    .set({ soapNote, updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function updateDiagnoses(
  id: string,
  diagnoses: DiagnosisSuggestion[]
): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ diagnosisSuggestions: diagnoses, updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function updateDrugs(id: string, drugs: PrescribedDrug[]): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ prescribedDrugs: drugs, updatedAt: new Date() })
    .where(eq(consultations.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function updateReferralHospital(
  id: string,
  hospital: ReferralHospital
): Promise<boolean> {
  const result = await db
    .update(consultations)
    .set({ referralHospital: hospital, updatedAt: new Date() })
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
  // Fetch-modify-write: JSONB arrays don't support atomic append via Drizzle typed API
  const row = await db.query.consultations.findFirst({
    where: eq(consultations.id, id),
  });
  if (!row) return false;

  const updated = [...((row.auditLog as AuditLogEntry[]) ?? []), entry];
  const result = await db
    .update(consultations)
    .set({ auditLog: updated, updatedAt: new Date() })
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

export async function getConsultationStats(doctorId: string): Promise<{
  total: number;
  pendingReview: number;
  completedToday: number;
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalResult, pendingResult, todayResult] = await Promise.all([
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
          eq(consultations.status, "finalized"),
          gte(consultations.updatedAt, todayStart)
        )
      ),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    pendingReview: pendingResult[0]?.count ?? 0,
    completedToday: todayResult[0]?.count ?? 0,
  };
}
