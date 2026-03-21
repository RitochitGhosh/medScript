import { z } from "zod";

export const PatientGenderSchema = z.enum(["male", "female", "other"]);

export const ConsultationStatusSchema = z.enum([
  "draft",
  "in_review",
  "approved",
  "finalized",
]);

export const HitlSectionSchema = z.enum([
  "subjective",
  "objective",
  "assessment",
  "plan",
  "drug",
  "diagnosis",
]);

export const KnowledgeCategorySchema = z.enum([
  "drug",
  "diagnosis",
  "treatment",
  "icd10",
  "interaction",
]);

export const SoapNoteSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
});

export const HitlFlagSchema = z.object({
  section: HitlSectionSchema,
  field: z.string(),
  reason: z.string(),
  resolved: z.boolean(),
  doctorEdit: z.string().optional(),
});

export const AuditLogEntrySchema = z.object({
  action: z.string(),
  timestamp: z.date(),
  aiSuggested: z.string(),
  doctorApproved: z.string(),
});

export const DiagnosisSuggestionSchema = z.object({
  diagnosis: z.string(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  recommendedTests: z.array(z.string()),
  redFlags: z.array(z.string()),
  guidelineUrl: z.string().optional(),
  guidelineSummary: z.string().optional(),
});

export const PrescribedDrugSchema = z.object({
  name: z.string(),
  brandName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  price: z.string().optional(),
  availability: z.string().optional(),
});

export const ReferralHospitalSchema = z.object({
  name: z.string(),
  address: z.string(),
  specialty: z.string(),
  contact: z.string().optional(),
  distance: z.string().optional(),
});

export const GeolocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  city: z.string(),
});

export const ConsultationSchema = z.object({
  doctorId: z.string(),
  patientName: z.string().min(1),
  patientAge: z.number().int().min(0).max(150),
  patientGender: PatientGenderSchema,
  rawTranscript: z.string(),
  soapNote: SoapNoteSchema,
  diagnosisSuggestions: z.array(DiagnosisSuggestionSchema).default([]),
  prescribedDrugs: z.array(PrescribedDrugSchema).default([]),
  referralHospital: ReferralHospitalSchema.optional(),
  hitlFlags: z.array(HitlFlagSchema).default([]),
  auditLog: z.array(AuditLogEntrySchema).default([]),
  status: ConsultationStatusSchema.default("draft"),
  geolocation: GeolocationSchema.optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const MedicalKnowledgeSchema = z.object({
  content: z.string(),
  embedding: z.array(z.number()),
  metadata: z.object({
    category: KnowledgeCategorySchema,
    source: z.string(),
    tags: z.array(z.string()),
  }),
});

export type ConsultationInput = z.infer<typeof ConsultationSchema>;
export type MedicalKnowledgeInput = z.infer<typeof MedicalKnowledgeSchema>;
