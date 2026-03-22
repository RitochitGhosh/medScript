import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Consultation } from "@workspace/types";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const C = {
  primary: "#1a4fa0",
  muted: "#6b7280",
  border: "#d1d5db",
  bg: "#f9fafb",
  text: "#111827",
  light: "#f3f4f6",
  green: "#166534",
  greenBg: "#f0fdf4",
  greenBorder: "#86efac",
  red: "#991b1b",
  redBg: "#fef2f2",
  redBorder: "#fca5a5",
};

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 36, color: C.text },

  // ── Letterhead ──────────────────────────────────────────────────────────
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    marginBottom: 10,
  },
  doctorName: { fontSize: 15, fontWeight: "bold", color: C.primary },
  doctorSub: { fontSize: 8, color: C.muted, marginTop: 2, lineHeight: 1.5 },
  clinicRight: { textAlign: "right" },
  clinicName: { fontSize: 11, fontWeight: "bold", color: C.text },
  clinicSub: { fontSize: 8, color: C.muted, textAlign: "right", lineHeight: 1.5 },

  // ── Patient strip ───────────────────────────────────────────────────────
  patientStrip: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: C.light,
    padding: 8,
    borderRadius: 3,
    marginBottom: 10,
  },
  patientCell: { flex: 1 },
  patientLabel: { fontSize: 7, color: C.muted, textTransform: "uppercase", marginBottom: 1 },
  patientValue: { fontSize: 10, fontWeight: "bold" },

  // ── Diagnosis ───────────────────────────────────────────────────────────
  diagLine: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  diagBold: { fontSize: 9, fontWeight: "bold", color: C.text },
  diagText: { fontSize: 9, color: C.text, flex: 1, lineHeight: 1.5 },

  // ── Rx block ────────────────────────────────────────────────────────────
  rxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingBottom: 4,
  },
  rxSymbol: { fontSize: 22, fontWeight: "bold", color: C.primary },
  rxLabel: { fontSize: 8, color: C.muted },

  // ── Drug item ──────────────────────────────────────────────────────────
  drugItem: {
    marginBottom: 8,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: C.primary,
  },
  drugNum: { fontSize: 9, fontWeight: "bold", color: C.primary },
  drugName: { fontSize: 10, fontWeight: "bold", color: C.text },
  drugBrand: { fontSize: 8, color: C.muted },
  drugDetail: { fontSize: 9, color: C.text, marginTop: 2 },
  drugFreq: { fontSize: 9, color: C.muted, marginTop: 1 },

  // ── Advice ─────────────────────────────────────────────────────────────
  adviceBox: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  adviceLabel: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: C.muted, marginBottom: 3 },
  adviceText: { fontSize: 9, color: C.text, lineHeight: 1.6 },

  // ── Referral ────────────────────────────────────────────────────────────
  referralBox: {
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: C.greenBorder,
    padding: 7,
    borderRadius: 3,
    marginTop: 8,
  },
  referralTitle: { fontSize: 9, fontWeight: "bold", color: C.green, marginBottom: 3 },
  referralText: { fontSize: 8, color: C.text, lineHeight: 1.5 },

  // ── Signature ────────────────────────────────────────────────────────────
  signatureRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  signatureBox: { width: 140, alignItems: "center" },
  signatureLine: { borderTopWidth: 1, borderTopColor: C.text, width: 120, marginBottom: 4 },
  signatureText: { fontSize: 8, color: C.muted, textAlign: "center" },
  signatureDoctor: { fontSize: 9, fontWeight: "bold", color: C.text, textAlign: "center", marginTop: 2 },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#9ca3af" },

  // ── Page 2 ──────────────────────────────────────────────────────────────
  soapSection: { marginBottom: 8 },
  soapLabel: { fontSize: 8, fontWeight: "bold", color: C.muted, marginBottom: 2, textTransform: "uppercase" },
  soapText: { fontSize: 9, color: C.text, lineHeight: 1.5 },

  instructionBox: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 9,
    borderRadius: 3,
    marginBottom: 7,
  },
  instructionDrug: { fontSize: 11, fontWeight: "bold", color: C.primary, marginBottom: 2 },
  instructionText: { fontSize: 9, color: C.text, lineHeight: 1.5 },
  disclaimer: {
    backgroundColor: C.redBg,
    borderWidth: 1,
    borderColor: C.redBorder,
    padding: 8,
    borderRadius: 3,
    marginTop: 12,
  },
  disclaimerText: { fontSize: 8, color: C.red },
});

interface PrescriptionPDFProps {
  consultation: Consultation;
  doctorName?: string;
  clinicName?: string;
}

export function PrescriptionPDF({ consultation, doctorName, clinicName }: PrescriptionPDFProps) {
  const date = new Date(consultation.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Build a compact diagnosis string from assessment
  const diagnosisText = consultation.soapNote.assessment || "—";

  // Build advice from plan
  const adviceText = consultation.soapNote.plan || "—";

  return (
    <Document
      title={`Prescription — ${consultation.patientName}`}
      author={doctorName ?? "MedScript AI"}
    >
      {/* ═══════════════════════════ PAGE 1 — Prescription ═══════════════════════════ */}
      <Page size="A4" style={styles.page}>

        {/* ── Letterhead ── */}
        <View style={styles.letterhead}>
          <View>
            {doctorName ? (
              <Text style={styles.doctorName}>{doctorName}</Text>
            ) : (
              <Text style={styles.doctorName}>MedScript AI</Text>
            )}
            <Text style={styles.doctorSub}>
              {consultation.doctorId ? "Medical Practitioner" : "AI-Assisted Clinical Documentation"}
            </Text>
          </View>
          <View style={styles.clinicRight}>
            {clinicName && <Text style={styles.clinicName}>{clinicName}</Text>}
            <Text style={styles.clinicSub}>Date: {date}</Text>
          </View>
        </View>

        {/* ── Patient Strip ── */}
        <View style={styles.patientStrip}>
          <View style={styles.patientCell}>
            <Text style={styles.patientLabel}>Patient Name</Text>
            <Text style={styles.patientValue}>{consultation.patientName}</Text>
          </View>
          <View style={styles.patientCell}>
            <Text style={styles.patientLabel}>Age / Sex</Text>
            <Text style={[styles.patientValue, { textTransform: "capitalize" }]}>
              {consultation.patientAge}y / {consultation.patientGender.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.patientCell}>
            <Text style={styles.patientLabel}>Ref. No.</Text>
            <Text style={styles.patientValue}>{consultation.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        {/* ── Provisional Diagnosis ── */}
        <View style={styles.diagLine}>
          <Text style={styles.diagBold}>Provisional Diagnosis:</Text>
          <Text style={styles.diagText}>{diagnosisText}</Text>
        </View>

        {/* ── Rx Block ── */}
        <View style={styles.rxHeader}>
          <Text style={styles.rxSymbol}>℞</Text>
          <Text style={styles.rxLabel}>Prescription</Text>
        </View>

        {consultation.prescribedDrugs.length === 0 && (
          <Text style={{ fontSize: 9, color: C.muted }}>No medications prescribed.</Text>
        )}

        {consultation.prescribedDrugs.map((drug, i) => (
          <View key={i} style={styles.drugItem}>
            <Text style={styles.drugNum}>{i + 1}.</Text>
            <Text style={styles.drugName}>
              {drug.name}
              {drug.brandName ? `  (${drug.brandName})` : ""}
            </Text>
            <Text style={styles.drugDetail}>
              {drug.dosage}  —  {drug.frequency}
            </Text>
            <Text style={styles.drugFreq}>
              Duration: {drug.duration}
              {drug.price ? `   |   ₹${drug.price}` : ""}
            </Text>
          </View>
        ))}

        {/* ── Advice ── */}
        {adviceText && adviceText !== "—" && (
          <View style={styles.adviceBox}>
            <Text style={styles.adviceLabel}>Advice / Follow-up</Text>
            <Text style={styles.adviceText}>{adviceText}</Text>
          </View>
        )}

        {/* ── Referral ── */}
        {consultation.referralHospital && (
          <View style={styles.referralBox}>
            <Text style={styles.referralTitle}>
              Refer to: {consultation.referralHospital.name}
            </Text>
            <Text style={styles.referralText}>
              {consultation.referralHospital.address}
            </Text>
            <Text style={styles.referralText}>
              Speciality: {consultation.referralHospital.specialty}
            </Text>
            {consultation.referralHospital.contact && (
              <Text style={styles.referralText}>
                Contact: {consultation.referralHospital.contact}
              </Text>
            )}
          </View>
        )}

        {/* ── Signature ── */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureDoctor}>{doctorName ?? "Doctor"}</Text>
            <Text style={styles.signatureText}>Signature &amp; Stamp</Text>
            <Text style={styles.signatureText}>{date}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MedScript AI — HITL Verified Prescription</Text>
          <Text style={styles.footerText}>Ref: {consultation.id}</Text>
        </View>
      </Page>

      {/* ═══════════════════════════ PAGE 2 — Clinical Notes + Patient Copy ═══════════════════════════ */}
      <Page size="A4" style={styles.page}>

        {/* Letterhead repeated */}
        <View style={styles.letterhead}>
          <View>
            <Text style={styles.doctorName}>{doctorName ?? "MedScript AI"}</Text>
          </View>
          <View style={styles.clinicRight}>
            {clinicName && <Text style={styles.clinicName}>{clinicName}</Text>}
            <Text style={styles.clinicSub}>{date}</Text>
          </View>
        </View>

        {/* Clinical SOAP notes (for records) */}
        <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, color: C.primary }}>
          Clinical Notes (For Records)
        </Text>

        <View style={styles.soapSection}>
          <Text style={styles.soapLabel}>S — Subjective</Text>
          <Text style={styles.soapText}>{consultation.soapNote.subjective}</Text>
        </View>
        <View style={styles.soapSection}>
          <Text style={styles.soapLabel}>O — Objective</Text>
          <Text style={styles.soapText}>{consultation.soapNote.objective}</Text>
        </View>
        <View style={styles.soapSection}>
          <Text style={styles.soapLabel}>A — Assessment</Text>
          <Text style={styles.soapText}>{consultation.soapNote.assessment}</Text>
        </View>
        <View style={styles.soapSection}>
          <Text style={styles.soapLabel}>P — Plan</Text>
          <Text style={styles.soapText}>{consultation.soapNote.plan}</Text>
        </View>

        {/* Patient-friendly medicine summary */}
        {consultation.prescribedDrugs.length > 0 && (
          <>
            <Text style={{ fontSize: 11, fontWeight: "bold", marginTop: 14, marginBottom: 6, color: C.primary }}>
              Medicine Instructions (Patient Copy)
            </Text>
            {consultation.prescribedDrugs.map((drug, i) => (
              <View key={i} style={styles.instructionBox}>
                <Text style={styles.instructionDrug}>
                  {i + 1}. {drug.name} ({drug.brandName})
                </Text>
                <Text style={styles.instructionText}>
                  Take {drug.dosage} — {drug.frequency}
                </Text>
                <Text style={styles.instructionText}>Continue for: {drug.duration}</Text>
                {drug.availability && (
                  <Text style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>
                    Available at: {drug.availability}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* AI Diagnosis Reference */}
        {consultation.diagnosisSuggestions.length > 0 && (
          <>
            <Text style={{ fontSize: 8, color: C.muted, fontStyle: "italic", marginTop: 10 }}>
              AI Differential Diagnosis Reference — For Doctor Use Only
            </Text>
            {consultation.diagnosisSuggestions.slice(0, 3).map((d, i) => (
              <View key={i} style={{ marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.border }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: C.text }}>
                  {i + 1}. {d.diagnosis}  ({d.confidence}%)
                </Text>
                <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.4 }}>{d.reasoning}</Text>
              </View>
            ))}
          </>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This prescription was generated with AI assistance and reviewed by a qualified doctor.
            Do not alter your medicine without consulting your doctor.
            Report any adverse effects immediately.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MedScript AI — HITL Verified</Text>
          <Text style={styles.footerText}>Page 2 of 2</Text>
        </View>
      </Page>
    </Document>
  );
}
