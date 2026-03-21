# MedScript AI — Smolify Integration Guide

This document explains how MedScript AI's AI pipelines can be registered as Smolify workflows and automations.

---

## 1. Diagnosis Pipeline as a Smolify Workflow

The diagnosis pipeline (`/api/diagnosis`) can be registered as a Smolify workflow that triggers automatically after a SOAP note is generated.

### Workflow Definition

```yaml
name: medscript-diagnosis-pipeline
trigger:
  type: webhook
  url: https://your-medscript-domain.com/api/smolify/diagnosis-trigger
  secret: ${SMOLIFY_WEBHOOK_SECRET}

steps:
  - id: validate-consultation
    type: http_request
    config:
      method: GET
      url: "https://your-medscript-domain.com/api/consultation/{{trigger.consultationId}}"
      headers:
        Authorization: "Bearer {{env.MEDSCRIPT_API_TOKEN}}"

  - id: extract-symptoms
    type: transform
    config:
      input: "{{steps.validate-consultation.response.soapNote.subjective}}"
      transform: "extract_symptoms_from_soap"

  - id: run-diagnosis
    type: http_request
    config:
      method: POST
      url: "https://your-medscript-domain.com/api/diagnosis"
      headers:
        Content-Type: application/json
        Authorization: "Bearer {{env.MEDSCRIPT_API_TOKEN}}"
      body:
        consultationId: "{{trigger.consultationId}}"
        symptoms: "{{steps.extract-symptoms.output}}"
        extractedData: "{{steps.validate-consultation.response.soapNote}}"

  - id: notify-doctor
    type: notification
    config:
      channel: in_app
      message: "AI diagnosis suggestions ready for {{steps.validate-consultation.response.patientName}}"
      link: "/consult/{{trigger.consultationId}}"
```

### Triggering the Workflow

The MedScript backend triggers this Smolify workflow after SOAP note generation:

```typescript
// In /api/generate-note/route.ts — after consultation is created
await fetch("https://api.smolify.io/v1/workflows/medscript-diagnosis-pipeline/trigger", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.SMOLIFY_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    consultationId: consultation._id,
    doctorId: doctorId,
    patientName: consultation.patientName
  })
});
```

---

## 2. PDF Generation as a Smolify Post-HITL Automation

After a doctor approves all HITL flags and clicks "Approve & Generate PDF", Smolify can automate the post-approval steps including PDF storage, notification, and audit.

### Automation Definition

```yaml
name: medscript-post-hitl-approval
trigger:
  type: webhook
  url: https://your-medscript-domain.com/api/smolify/post-approval
  event: consultation.approved

steps:
  - id: generate-pdf
    type: http_request
    config:
      method: POST
      url: "https://your-medscript-domain.com/api/generate-pdf"
      headers:
        Content-Type: application/json
        Authorization: "Bearer {{env.MEDSCRIPT_API_TOKEN}}"
      body:
        consultationId: "{{trigger.consultationId}}"
      response_type: binary

  - id: store-pdf
    type: file_storage
    config:
      provider: s3  # or any storage
      bucket: "medscript-prescriptions"
      key: "prescriptions/{{trigger.consultationId}}.pdf"
      content: "{{steps.generate-pdf.response}}"
      acl: private

  - id: log-audit
    type: http_request
    config:
      method: POST
      url: "https://your-medscript-domain.com/api/audit-log"
      headers:
        Content-Type: application/json
        Authorization: "Bearer {{env.MEDSCRIPT_API_TOKEN}}"
      body:
        consultationId: "{{trigger.consultationId}}"
        action: "pdf_generated_and_stored"
        aiSuggested: "PDF auto-generated post HITL approval"
        doctorApproved: "Approved by {{trigger.doctorName}} at {{trigger.timestamp}}"

  - id: send-notification
    type: notification
    config:
      channel: sms  # optional: send SMS to patient
      to: "{{trigger.patientPhone}}"
      message: "Your prescription from Dr. {{trigger.doctorName}} is ready. Reference: {{trigger.consultationId}}"
```

---

## 3. Webhook Endpoint Design for Smolify

### Endpoint: `POST /api/smolify/diagnosis-trigger`

Smolify calls this to initiate diagnosis workflow.

```typescript
// apps/web/app/api/smolify/diagnosis-trigger/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  // Verify Smolify webhook signature
  const signature = request.headers.get("x-smolify-signature");
  const body = await request.text();
  const expectedSig = crypto
    .createHmac("sha256", process.env.SMOLIFY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  if (signature !== `sha256=${expectedSig}`) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as {
    consultationId: string;
    doctorId: string;
  };

  // Trigger diagnosis chain
  // (can queue as background job)
  fetch(`${process.env.NEXTAUTH_URL}/api/diagnosis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consultationId: payload.consultationId,
      symptoms: [],
      extractedData: {},
    }),
  }).catch(console.error);

  return NextResponse.json({ received: true });
}
```

### Endpoint: `POST /api/smolify/post-approval`

Smolify calls this after HITL approval to trigger PDF automation.

```typescript
// Request body from Smolify
{
  "event": "consultation.approved",
  "consultationId": "6789abcdef1234567890",
  "doctorId": "doctor-1",
  "doctorName": "Dr. Priya Sharma",
  "patientName": "Ramesh Kumar",
  "patientPhone": "+91-9876543210",  // optional
  "timestamp": "2025-03-21T10:30:00.000Z"
}
```

---

## 4. Environment Variables for Smolify Integration

Add these to your `.env.local`:

```bash
SMOLIFY_API_KEY=smolify_...
SMOLIFY_WEBHOOK_SECRET=...
MEDSCRIPT_API_TOKEN=...  # Internal API token for Smolify → MedScript calls
```

---

## 5. Smolify Workflow Registration

Register workflows via Smolify dashboard or API:

```bash
# Register diagnosis workflow
curl -X POST https://api.smolify.io/v1/workflows \
  -H "Authorization: Bearer $SMOLIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d @docs/smolify-diagnosis-workflow.yaml

# Register post-approval automation
curl -X POST https://api.smolify.io/v1/automations \
  -H "Authorization: Bearer $SMOLIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d @docs/smolify-post-approval-automation.yaml
```
