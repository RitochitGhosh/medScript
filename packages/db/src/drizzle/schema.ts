import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import type {
  SoapNote,
  DiagnosisSuggestion,
  PrescribedDrug,
  HitlFlag,
  AuditLogEntry,
  ReferralHospital,
  Geolocation,
} from "@workspace/types";

// ---------- Enums ----------

export const userRoleEnum = pgEnum("user_role", ["doctor", "patient"]);
export const patientGenderEnum = pgEnum("patient_gender", ["male", "female", "other"]);
export const consultationStatusEnum = pgEnum("consultation_status", [
  "draft",
  "in_review",
  "approved",
  "finalized",
]);

// ---------- Tables ----------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  role: userRoleEnum("role").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  specialization: text("specialization"),
  clinicName: text("clinic_name"),
  licenseNumber: text("license_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Nullable — a doctor can create a patient who hasn't signed up yet */
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: patientGenderEnum("gender").notNull(),
  phone: text("phone"),
  bloodGroup: text("blood_group"),
  allergies: text("allergies").array().default([]).notNull(),
  /** Doctor can flag a patient as requiring attention/critical follow-up */
  isCritical: boolean("is_critical").default(false).notNull(),
  criticalNote: text("critical_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const consultations = pgTable("consultations", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .references(() => doctors.id, { onDelete: "cascade" })
    .notNull(),
  patientId: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),

  // Denormalized patient fields — immutable snapshot at time of consultation
  patientName: text("patient_name").notNull(),
  patientAge: integer("patient_age").notNull(),
  patientGender: patientGenderEnum("patient_gender").notNull(),

  rawTranscript: text("raw_transcript").notNull(),
  status: consultationStatusEnum("status").default("draft").notNull(),

  // JSONB columns — always read/written as units
  soapNote: jsonb("soap_note").$type<SoapNote>().notNull(),
  diagnosisSuggestions: jsonb("diagnosis_suggestions")
    .$type<DiagnosisSuggestion[]>()
    .default([])
    .notNull(),
  prescribedDrugs: jsonb("prescribed_drugs")
    .$type<PrescribedDrug[]>()
    .default([])
    .notNull(),
  hitlFlags: jsonb("hitl_flags").$type<HitlFlag[]>().default([]).notNull(),
  auditLog: jsonb("audit_log").$type<AuditLogEntry[]>().default([]).notNull(),
  referralHospital: jsonb("referral_hospital").$type<ReferralHospital>(),
  geolocation: jsonb("geolocation").$type<Geolocation>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const consultationQuestions = pgTable("consultation_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id")
    .references(() => consultations.id, { onDelete: "cascade" })
    .notNull(),
  patientId: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  question: text("question").notNull(),
  answer: text("answer"), // null until AI answers
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- Inferred row types ----------

export type UserRow = typeof users.$inferSelect;
export type DoctorRow = typeof doctors.$inferSelect;
export type PatientRow = typeof patients.$inferSelect;
export type ConsultationRow = typeof consultations.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewDoctor = typeof doctors.$inferInsert;
export type NewPatient = typeof patients.$inferInsert;
export type NewConsultation = typeof consultations.$inferInsert;
export type ConsultationQuestionRow = typeof consultationQuestions.$inferSelect;
export type NewConsultationQuestion = typeof consultationQuestions.$inferInsert;
