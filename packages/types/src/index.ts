// Shared TypeScript types for MedScript AI

export type PatientGender = "male" | "female" | "other";

export type ConsultationStatus = "draft" | "in_review" | "approved" | "finalized";

export type HitlSection =
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "drug"
  | "diagnosis";

export type KnowledgeCategory =
  | "drug"
  | "diagnosis"
  | "treatment"
  | "icd10"
  | "interaction";

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface SoapSectionConfidence {
  subjective: number;
  objective: number;
  assessment: number;
  plan: number;
}

export interface HitlFlag {
  section: HitlSection;
  field: string;
  reason: string;
  resolved: boolean;
  doctorEdit?: string;
}

export interface AuditLogEntry {
  action: string;
  timestamp: Date;
  aiSuggested: string;
  doctorApproved: string;
}

export interface DiagnosisSuggestion {
  diagnosis: string;
  confidence: number; // 0-100
  reasoning: string;
  recommendedTests: string[];
  redFlags: string[];
  guidelineUrl?: string;
  guidelineSummary?: string;
}

export interface PrescribedDrug {
  name: string;
  brandName: string;
  dosage: string;
  frequency: string;
  duration: string;
  price?: string;
  availability?: string;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
}

export interface ReferralHospital {
  name: string;
  address: string;
  specialty: string;
  contact?: string;
  distance?: string;
}

export interface Geolocation {
  lat: number;
  lng: number;
  city: string;
}

export interface Consultation {
  _id: string;
  doctorId: string;
  patientName: string;
  patientAge: number;
  patientGender: PatientGender;
  rawTranscript: string;
  soapNote: SoapNote;
  diagnosisSuggestions: DiagnosisSuggestion[];
  prescribedDrugs: PrescribedDrug[];
  referralHospital?: ReferralHospital;
  hitlFlags: HitlFlag[];
  auditLog: AuditLogEntry[];
  status: ConsultationStatus;
  geolocation?: Geolocation;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalKnowledgeChunk {
  _id: string;
  content: string;
  embedding: number[];
  metadata: {
    category: KnowledgeCategory;
    source: string;
    tags: string[];
  };
}

export interface PatientContext {
  name: string;
  age: number;
  gender: PatientGender;
  chiefComplaint?: string;
}

export interface ExtractedClinicalData {
  symptoms: string[];
  vitals: string[];
  complaints: string[];
  duration: string;
  medicationsMentioned: string[];
}

export interface RagChunk {
  content: string;
  score: number;
  metadata: {
    category: KnowledgeCategory;
    source: string;
    tags: string[];
  };
}

export interface Hospital {
  name: string;
  address: string;
  specialty: string;
  contact?: string;
  distance?: string;
}

export interface ApiError {
  error: string;
  code: string;
}

export interface TranscribeResponse {
  transcript: string;
}

export interface GenerateNoteResponse {
  consultation: Consultation;
}

export interface DiagnosisResponse {
  diagnoses: DiagnosisSuggestion[];
}

export interface DrugSearchResponse {
  enrichedDrugs: PrescribedDrug[];
  interactions: DrugInteraction[];
}

export interface HospitalSearchResponse {
  hospitals: Hospital[];
}

export interface Doctor {
  id: string;
  email: string;
  name: string;
  specialization?: string;
  clinicName?: string;
}
