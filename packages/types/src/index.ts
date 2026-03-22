// Shared TypeScript types for MedScript AI

export type UserRole = "doctor" | "patient";

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
  | "interaction"
  | "guideline"
  | "general";

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
  ragEnriched?: boolean; // true when diagnosis was informed by the medical knowledge base
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

export interface User {
  id: string;
  clerkUserId: string;
  role: UserRole;
  email: string;
  createdAt: Date;
}

export interface DoctorProfile {
  id: string; // doctors.id UUID
  userId: string; // users.id UUID
  clerkUserId: string;
  name: string;
  email: string;
  specialization: string | null;
  clinicName: string | null;
  licenseNumber: string | null;
}

export interface PatientProfile {
  id: string; // patients.id UUID — internal primary key
  patientCode: string; // short unique code (6 chars) shared with the patient for lookup
  userId: string | null; // null if patient has no Clerk account
  name: string;
  age: number;
  gender: PatientGender;
  phone: string | null;
  bloodGroup: string | null;
  allergies: string[];
  isCritical: boolean;
  criticalNote: string | null;
  createdAt: Date;
}

export interface ConsultationQuestion {
  id: string;
  consultationId: string;
  patientId: string;
  question: string;
  answer: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientHistoryEntry {
  consultationId: string;
  date: string; // ISO date string
  assessment: string;
  plan: string;
  drugs: string[];
  diagnoses: string[];
}

export interface Consultation {
  id: string; // UUID (was _id in MongoDB)
  doctorId: string; // doctors.id UUID
  patientId: string; // patients.id UUID
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
  priorHistory?: PatientHistoryEntry[];
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
  /** Tavily AI answer synthesised from live web search results. */
  summary?: string;
}

/** @deprecated Use DoctorProfile */
export interface Doctor {
  id: string;
  email: string;
  name: string;
  specialization?: string;
  clinicName?: string;
}
