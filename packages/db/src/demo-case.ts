/**
 * Demo Case Seeder — Bone Fracture Consultation
 *
 * Creates a demo doctor + anonymous patient and seeds one realistic
 * Colles' fracture consultation with all medical fields AES-256-GCM encrypted.
 * No real personal data is stored — the patient record uses a generated code only.
 *
 * Run: npm run demo
 */

import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../../apps/web/.env.local") });

import { db } from "./drizzle/client";
import { users, doctors, patients, consultations } from "./drizzle/schema";
import { encrypt, encryptJSON } from "./crypto";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_CLERK_ID = "demo_doctor_colles_001";
const DEMO_EMAIL = "demo.doctor@medscript.demo";
const DEMO_DOCTOR_NAME = "Dr. Arjun Mehta";

const DEMO_PATIENT_CODE = "FRAC01";

// Verbatim voice transcript the doctor recorded
const RAW_TRANSCRIPT = `
Patient is a 42-year-old male who presents to the OPD with severe pain and swelling
of the right wrist following a fall on an outstretched hand while descending stairs
about two hours ago. He reports immediate onset of pain, visible deformity, and
complete inability to move the wrist. No numbness or tingling in the fingers.
No loss of consciousness. No other injuries.

On examination: marked swelling and tenderness over the distal radius with classic
dinner-fork deformity. Neurovascular status intact — radial pulse present, capillary
refill less than two seconds, sensation intact in all finger distributions.

X-ray right wrist AP and lateral: extra-articular fracture of distal radius with
approximately 20 degrees of dorsal angulation and 5 mm of radial shortening.
No intra-articular extension. No ulnar styloid fracture.

Diagnosis: Closed Colles' fracture right distal radius.

Management: Closed reduction performed under haematoma block with 10 mL of 2%
lignocaine injected into the fracture haematoma. Satisfactory reduction achieved
with longitudinal traction and palmar flexion. Dorsal plaster backslab applied.
Post-reduction X-ray confirms acceptable position — angulation less than 5 degrees,
shortening corrected.

Prescriptions: Tab Ibuprofen 400 mg three times daily with food for five days,
Tab Pantoprazole 40 mg once daily for gastric protection, Tab Calcium plus Vitamin D3
500 mg twice daily for six weeks.

Advice: Elevate the limb above heart level, apply ice pack wrapped in cloth for
20 minutes four times a day for the first 48 hours. Return immediately if pallor,
severe pain, pulselessness, or paresthesia develops. Non-weight-bearing right
upper limb. Orthopaedic review in one week for definitive cast application.
Sick leave recommended for four weeks.
`.trim();

const SOAP_NOTE = {
  subjective:
    "42-year-old male with acute right wrist pain and deformity following FOOSH (fall on outstretched hand) while descending stairs ~2 hours ago. Immediate-onset severe pain, visible deformity, inability to move wrist. No numbness/tingling in fingers. No LOC. No other injuries.",
  objective:
    "Marked swelling, tenderness, and dinner-fork deformity at right distal radius. Radial pulse present. Capillary refill <2 s. Sensation intact in median, ulnar, and radial distributions. X-ray: extra-articular distal radius fracture, ~20° dorsal angulation, ~5 mm radial shortening, no intra-articular extension, no ulnar styloid fracture.",
  assessment:
    "Closed Colles' fracture of right distal radius (ICD-10: S52.501A). Satisfactory closed reduction achieved under haematoma block. Post-reduction alignment acceptable (<5° residual angulation).",
  plan:
    "1. Dorsal backslab POP applied — elevation and ice for 48 h.\n2. Orthopaedic review in 1 week for definitive circumferential cast.\n3. Pain management: Ibuprofen 400 mg TDS × 5 days + Pantoprazole 40 mg OD.\n4. Calcium + Vitamin D3 500 mg BD × 6 weeks for bone healing.\n5. STRICT return precautions: pallor, pulselessness, paraesthesia, paralysis (4 Ps).\n6. Non-weight-bearing right upper limb. Sick leave × 4 weeks.",
};

const DIAGNOSIS_SUGGESTIONS = [
  {
    diagnosis: "Colles' Fracture (Distal Radius Fracture)",
    confidence: 97,
    reasoning:
      "Classic mechanism (FOOSH), dinner-fork deformity, X-ray confirming extra-articular distal radius fracture with dorsal angulation and radial shortening are pathognomonic.",
    recommendedTests: [
      "X-ray wrist AP + lateral (done)",
      "CT wrist if intra-articular extension suspected",
      "Neurovascular assessment (done)",
    ],
    redFlags: [
      "Absent radial pulse → vascular injury, refer immediately",
      "Compartment syndrome signs: severe pain on passive stretch, tense forearm",
      "Median nerve injury (numbness in thumb/index/middle finger)",
    ],
    guidelineSummary: "BOA/BSSH: closed reduction + backslab if <10° angulation acceptable after reduction; open reduction considered if unstable or fails closed reduction.",
    ragEnriched: false,
  },
  {
    diagnosis: "Scaphoid Fracture",
    confidence: 12,
    reasoning:
      "FOOSH mechanism can cause scaphoid fracture; however X-ray confirms distal radius fracture as primary injury. Scaphoid tenderness (anatomical snuffbox) not documented.",
    recommendedTests: ["X-ray scaphoid views", "MRI if X-ray normal but snuffbox tenderness present"],
    redFlags: ["Avascular necrosis of scaphoid if missed and untreated"],
    ragEnriched: false,
  },
];

const PRESCRIBED_DRUGS = [
  {
    name: "Ibuprofen",
    brandName: "Brufen / Ibugesic",
    dosage: "400 mg",
    frequency: "Three times daily (TDS) with food",
    duration: "5 days",
    price: "₹25–40 / strip of 15",
    availability: "Available",
  },
  {
    name: "Pantoprazole",
    brandName: "Pan-40 / Pantocid",
    dosage: "40 mg",
    frequency: "Once daily (OD) before breakfast",
    duration: "5 days (concurrent with Ibuprofen)",
    price: "₹30–50 / strip of 15",
    availability: "Available",
  },
  {
    name: "Calcium + Vitamin D3",
    brandName: "Shelcal-500 / Calcimax",
    dosage: "500 mg elemental calcium + 250 IU D3",
    frequency: "Twice daily (BD) with meals",
    duration: "6 weeks",
    price: "₹80–120 / strip of 15",
    availability: "Available",
  },
];

const HITL_FLAGS = [
  {
    section: "objective" as const,
    field: "angulation",
    reason: "Post-reduction angulation documented verbally — verify against post-reduction X-ray report for exact degrees.",
    resolved: false,
  },
];

const AUDIT_LOG = [
  {
    action: "consultation_created",
    timestamp: new Date(),
    aiSuggested: "SOAP note generated from voice transcript",
    doctorApproved: "pending",
  },
  {
    action: "diagnosis_generated",
    timestamp: new Date(),
    aiSuggested: "Colles' Fracture (97%), Scaphoid Fracture (12%)",
    doctorApproved: "pending",
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function run() {
  console.log("\n=== Demo Case: Bone Fracture Consultation ===\n");

  // 1. Upsert demo doctor user + profile
  console.log("1. Creating demo doctor...");
  const [userRow] = await db
    .insert(users)
    .values({
      clerkUserId: DEMO_CLERK_ID,
      role: "doctor",
      email: DEMO_EMAIL,
      name: DEMO_DOCTOR_NAME,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { name: DEMO_DOCTOR_NAME, email: DEMO_EMAIL, updatedAt: new Date() },
    })
    .returning();

  const [doctorRow] = await db
    .insert(doctors)
    .values({
      userId: userRow!.id,
      specialization: "Orthopaedic Surgery",
      clinicName: "City Bone & Joint Clinic",
      licenseNumber: "MCI-ORT-2019-04821",
    })
    .onConflictDoUpdate({
      target: doctors.userId,
      set: { specialization: "Orthopaedic Surgery" },
    })
    .returning();

  console.log(`   ✓ Doctor: ${DEMO_DOCTOR_NAME} (id: ${doctorRow!.id})`);

  // 2. Upsert demo patient — NO real personal data; code is the only identifier shared
  console.log("\n2. Creating anonymous demo patient...");
  const existing = await db.query.patients.findFirst({
    where: eq(patients.patientCode, DEMO_PATIENT_CODE),
  });

  let patientRow = existing;
  if (!patientRow) {
    const [inserted] = await db
      .insert(patients)
      .values({
        patientCode: DEMO_PATIENT_CODE,
        name: "Demo Patient",       // placeholder — no real name stored
        age: 42,
        gender: "male",
        phone: null,                // no phone stored
        bloodGroup: "B+",
        allergies: ["Penicillin"],
        isCritical: false,
        criticalNote: null,
        userId: null,               // not linked to any Clerk account
      })
      .returning();
    patientRow = inserted!;
  }

  console.log(`   ✓ Patient code: ${DEMO_PATIENT_CODE}  (id: ${patientRow.id})`);
  console.log(`   ✓ No real personal data stored — name is placeholder only`);

  // 3. Seed the consultation with all medical fields encrypted
  console.log("\n3. Inserting consultation with AES-256-GCM encrypted medical data...");

  const [consult] = await db
    .insert(consultations)
    .values({
      doctorId: doctorRow!.id,
      patientId: patientRow.id,
      // Denormalized snapshot (not PHI-sensitive — just age/gender/name for display)
      patientName: "Demo Patient",
      patientAge: 42,
      patientGender: "male",
      // ↓ All fields below are encrypted at rest ↓
      rawTranscript: encrypt(RAW_TRANSCRIPT),
      soapNote: encryptJSON(SOAP_NOTE),
      diagnosisSuggestions: encryptJSON(DIAGNOSIS_SUGGESTIONS),
      prescribedDrugs: encryptJSON(PRESCRIBED_DRUGS),
      auditLog: encryptJSON(AUDIT_LOG),
      referralHospital: null,
      // JSONB (workflow metadata — not core PHI)
      hitlFlags: HITL_FLAGS,
      status: "in_review",
      geolocation: null,
    })
    .returning();

  console.log(`   ✓ Consultation id: ${consult!.id}`);
  console.log(`   ✓ Status: in_review (1 HITL flag pending doctor review)`);
  console.log(`   ✓ rawTranscript, soapNote, diagnoses, drugs, auditLog → all encrypted`);

  // 4. Summary
  console.log(`
=== Demo ready ===

Doctor login  : sign in with a Clerk account that maps to ${DEMO_CLERK_ID}
               OR look up the consultation directly in the dashboard.

Patient code  : ${DEMO_PATIENT_CODE}
               Doctor enters this code in /consult to find the patient.

Consultation  : /consult/${consult!.id}
               SOAP note, 2 diagnoses, 3 drugs, 1 HITL flag to resolve.

Encryption proof (raw DB value of soap_note column):
  ${(await db.query.consultations.findFirst({
    where: eq(consultations.id, consult!.id),
  }))?.soapNote?.slice(0, 80)}...
  (unreadable without ENCRYPTION_KEY)
`);

  process.exit(0);
}

run().catch((e) => {
  console.error("Demo seed failed:", e.message);
  process.exit(1);
});
