# MedScript AI — Requestly API Endpoints

All endpoints require authentication (NextAuth session cookie).
Base URL: `http://localhost:3000`

---

## POST /api/transcribe

Transcribes an audio recording using ElevenLabs Scribe STT.

**Content-Type:** `multipart/form-data`

**Request:**
```
audio: <audio file blob> (webm, ogg, mp3)
```

**Response 200:**
```json
{
  "transcript": "Patient reports fever for 3 days with headache and body aches. No vomiting. On paracetamol 500mg."
}
```

**Error Response:**
```json
{
  "error": "Audio file is required",
  "code": "MISSING_AUDIO"
}
```

---

## POST /api/generate-note

Generates SOAP note from transcript using LangChain + GPT-4o, with drug enrichment.

**Content-Type:** `application/json`

**Request:**
```json
{
  "transcript": "Patient reports fever for 3 days with headache...",
  "patientContext": {
    "name": "Ramesh Kumar",
    "age": 42,
    "gender": "male",
    "chiefComplaint": "Fever and headache for 3 days"
  }
}
```

**Response 200:**
```json
{
  "consultation": {
    "_id": "6789abcdef1234567890",
    "doctorId": "doctor-1",
    "patientName": "Ramesh Kumar",
    "patientAge": 42,
    "patientGender": "male",
    "rawTranscript": "...",
    "soapNote": {
      "subjective": "42-year-old male presents with fever for 3 days...",
      "objective": "Vitals not documented in transcript. Patient appears ill.",
      "assessment": "Likely viral fever. DDx includes dengue, malaria, typhoid.",
      "plan": "Paracetamol 500mg TDS, CBC, Dengue NS1 antigen test..."
    },
    "prescribedDrugs": [
      {
        "name": "Paracetamol",
        "brandName": "Crocin",
        "dosage": "500mg",
        "frequency": "TDS",
        "duration": "5 days",
        "price": "Rs 15-25",
        "availability": "Common"
      }
    ],
    "hitlFlags": [
      {
        "section": "objective",
        "field": "objective",
        "reason": "Low confidence (62%): Objective findings are limited...",
        "resolved": false
      }
    ],
    "auditLog": [...],
    "status": "draft",
    "createdAt": "2025-03-21T10:30:00.000Z",
    "updatedAt": "2025-03-21T10:30:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "error": "Failed to generate note",
  "code": "GENERATE_NOTE_FAILED"
}
```

---

## POST /api/diagnosis

Generates AI differential diagnoses using RAG + GPT-4o + Tavily.

**Content-Type:** `application/json`

**Request:**
```json
{
  "consultationId": "6789abcdef1234567890",
  "symptoms": ["fever", "headache", "body aches", "no vomiting"],
  "extractedData": {
    "duration": "3 days",
    "medicationsMentioned": ["paracetamol"]
  }
}
```

**Response 200:**
```json
{
  "diagnoses": [
    {
      "diagnosis": "Dengue Fever",
      "confidence": 72,
      "reasoning": "Sudden onset fever with severe headache and body aches in a 42-year-old male from India is highly suggestive of dengue...",
      "recommendedTests": ["CBC with differential", "Dengue NS1 antigen", "Dengue IgM/IgG"],
      "redFlags": ["Severe abdominal pain", "Bleeding from gums", "Rapid breathing"],
      "guidelineUrl": "https://www.who.int/docs/default-source/searo/india/health-topic-pdf/dengue-guidelines.pdf",
      "guidelineSummary": "WHO recommends supportive care for dengue..."
    },
    {
      "diagnosis": "Typhoid Fever",
      "confidence": 58,
      "reasoning": "Step-ladder fever pattern with headache in Indian patient warrants typhoid consideration...",
      "recommendedTests": ["Widal test", "Blood culture", "CBC"],
      "redFlags": ["Intestinal perforation symptoms", "Altered consciousness"],
      "guidelineUrl": "...",
      "guidelineSummary": "..."
    },
    {
      "diagnosis": "Viral Fever (Influenza/URTI)",
      "confidence": 45,
      "reasoning": "Non-specific viral syndrome remains a possibility...",
      "recommendedTests": ["CBC", "CRP"],
      "redFlags": ["High fever >104°F persistent", "Respiratory distress"],
      "guidelineUrl": null,
      "guidelineSummary": null
    }
  ]
}
```

---

## POST /api/drug-search

Enriches drug information with Indian pricing and availability via Tavily.

**Content-Type:** `application/json`

**Request:**
```json
{
  "drugs": ["Paracetamol", "Azithromycin", "Metformin"]
}
```

**Response 200:**
```json
{
  "enrichedDrugs": [
    {
      "name": "Paracetamol",
      "brandName": "Crocin",
      "dosage": "500mg",
      "frequency": "TDS",
      "duration": "5 days",
      "price": "Rs 15-25",
      "availability": "Common"
    },
    {
      "name": "Azithromycin",
      "brandName": "Azithral",
      "dosage": "500mg",
      "frequency": "OD",
      "duration": "5 days",
      "price": "Rs 70-150",
      "availability": "Common"
    }
  ],
  "interactions": [
    {
      "drug1": "Azithromycin",
      "drug2": "Metformin",
      "severity": "mild",
      "description": "Azithromycin may slightly increase metformin exposure. Monitor blood glucose."
    }
  ]
}
```

---

## POST /api/hospital-search

Searches for hospitals near patient location using Tavily.

**Content-Type:** `application/json`

**Request:**
```json
{
  "specialty": "Infectious Disease",
  "lat": 19.076,
  "lng": 72.877,
  "city": "Mumbai"
}
```

**Response 200:**
```json
{
  "hospitals": [
    {
      "name": "KEM Hospital",
      "address": "Acharya Donde Marg, Parel, Mumbai - 400012",
      "specialty": "Infectious Disease",
      "contact": "022-2410-7000",
      "distance": "5 km"
    },
    {
      "name": "Kasturba Hospital for Infectious Diseases",
      "address": "Sane Guruji Marg, Mumbai - 400011",
      "specialty": "Infectious Disease",
      "contact": "022-2308-5000",
      "distance": "3 km"
    }
  ]
}
```

---

## POST /api/generate-pdf

Generates and downloads a prescription PDF. Requires consultation to be approved.

**Content-Type:** `application/json`

**Request:**
```json
{
  "consultationId": "6789abcdef1234567890"
}
```

**Response 200:** `application/pdf` binary

**Error Response (HITL unresolved):**
```json
{
  "error": "Cannot generate PDF: 2 HITL flag(s) unresolved",
  "code": "HITL_UNRESOLVED"
}
```

**Error Response (not approved):**
```json
{
  "error": "Consultation must be approved before generating PDF",
  "code": "NOT_APPROVED"
}
```

---

## POST /api/audit-log

Appends an audit trail entry to a consultation.

**Content-Type:** `application/json`

**Request:**
```json
{
  "consultationId": "6789abcdef1234567890",
  "action": "resolve_flag_objective",
  "aiSuggested": "Low confidence in objective findings",
  "doctorApproved": "BP 120/80 mmHg, Temp 101°F, Pulse 92/min"
}
```

**Response 200:**
```json
{
  "success": true
}
```

---

## GET /api/consultation/[id]

Fetches a single consultation by ID.

**Response 200:** Full `Consultation` object (see generate-note response schema)

---

## POST /api/consultation/[id]/approve

Saves HITL resolutions and approves a consultation.

**Content-Type:** `application/json`

**Request:**
```json
{
  "hitlFlags": [
    {
      "section": "objective",
      "field": "objective",
      "reason": "Low confidence...",
      "resolved": true,
      "doctorEdit": "BP 120/80, Temp 101°F"
    }
  ],
  "soapNote": {
    "subjective": "...",
    "objective": "BP 120/80 mmHg, Temp 101°F. Patient appears febrile.",
    "assessment": "...",
    "plan": "..."
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "status": "approved"
}
```
