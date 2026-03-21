import { ObjectId } from "mongodb";
import { getDb } from "./client";
import { ConsultationSchema, type ConsultationInput } from "./schemas";
import type {
  Consultation,
  HitlFlag,
  AuditLogEntry,
  DiagnosisSuggestion,
  PrescribedDrug,
  ReferralHospital,
  ConsultationStatus,
} from "@workspace/types";

const COLLECTION = "consultations";

function toConsultation(doc: Record<string, unknown>): Consultation {
  return {
    ...doc,
    _id: (doc["_id"] as ObjectId).toString(),
    createdAt: doc["createdAt"] as Date,
    updatedAt: doc["updatedAt"] as Date,
  } as Consultation;
}

export async function createConsultation(
  data: ConsultationInput
): Promise<Consultation> {
  const db = await getDb();
  const validated = ConsultationSchema.parse(data);
  const now = new Date();
  const doc = { ...validated, createdAt: now, updatedAt: now };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return toConsultation({ ...doc, _id: result.insertedId });
}

export async function getConsultationById(id: string): Promise<Consultation | null> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;
  const doc = await db
    .collection(COLLECTION)
    .findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return toConsultation(doc as Record<string, unknown>);
}

export async function getConsultationsByDoctor(
  doctorId: string,
  limit = 20
): Promise<Consultation[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ doctorId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => toConsultation(d as Record<string, unknown>));
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus
): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function updateSoapNote(
  id: string,
  soapNote: Consultation["soapNote"]
): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { soapNote, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function updateDiagnoses(
  id: string,
  diagnoses: DiagnosisSuggestion[]
): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { diagnosisSuggestions: diagnoses, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function updateDrugs(
  id: string,
  drugs: PrescribedDrug[]
): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { prescribedDrugs: drugs, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function updateReferralHospital(
  id: string,
  hospital: ReferralHospital
): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { referralHospital: hospital, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function resolveHitlFlag(
  id: string,
  flagIndex: number,
  doctorEdit: string
): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        [`hitlFlags.${flagIndex}.resolved`]: true,
        [`hitlFlags.${flagIndex}.doctorEdit`]: doctorEdit,
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount > 0;
}

export async function updateHitlFlags(
  id: string,
  hitlFlags: HitlFlag[]
): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { hitlFlags, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function appendAuditLog(
  id: string,
  entry: AuditLogEntry
): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (db.collection(COLLECTION) as any).updateOne(
    { _id: new ObjectId(id) },
    {
      $push: { auditLog: entry },
      $set: { updatedAt: new Date() },
    }
  );
  return result.modifiedCount > 0;
}

export async function getConsultationStats(doctorId: string): Promise<{
  total: number;
  pendingReview: number;
  completedToday: number;
}> {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, pendingReview, completedToday] = await Promise.all([
    db.collection(COLLECTION).countDocuments({ doctorId }),
    db.collection(COLLECTION).countDocuments({ doctorId, status: "in_review" }),
    db.collection(COLLECTION).countDocuments({
      doctorId,
      status: "finalized",
      updatedAt: { $gte: today },
    }),
  ]);

  return { total, pendingReview, completedToday };
}

export async function approveConsultation(id: string): Promise<boolean> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;

  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!doc) return false;

  const hitlFlags = (doc["hitlFlags"] ?? []) as HitlFlag[];
  const unresolvedFlags = hitlFlags.filter((f) => !f.resolved);
  if (unresolvedFlags.length > 0) {
    throw new Error(
      `Cannot approve: ${unresolvedFlags.length} HITL flag(s) are unresolved`
    );
  }

  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "approved", updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}
