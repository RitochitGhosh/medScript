import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Consultation } from "@workspace/types";

// Register fonts
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
  },
  clinicInfo: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 12,
  },
  patientBox: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    flexDirection: "row",
    gap: 20,
  },
  patientField: {
    flex: 1,
  },
  patientLabel: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  patientValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  soapSection: {
    marginBottom: 10,
  },
  soapLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 3,
  },
  soapText: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
  },
  table: {
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    fontSize: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
  },
  col1: { flex: 2 },
  col2: { flex: 1.5 },
  col3: { flex: 1 },
  col4: { flex: 1 },
  col5: { flex: 1 },
  col6: { flex: 1.5 },
  diagnosisBox: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
    padding: 8,
    marginBottom: 6,
    borderRadius: 2,
  },
  diagnosisLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1d4ed8",
  },
  diagnosisConfidence: {
    fontSize: 7,
    color: "#3b82f6",
    marginBottom: 3,
  },
  diagnosisText: {
    fontSize: 8,
    color: "#374151",
    lineHeight: 1.4,
  },
  referralBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  referralTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 4,
  },
  referralText: {
    fontSize: 8,
    color: "#374151",
  },
  signatureLine: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureBox: {
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 4,
    width: 150,
    textAlign: "center",
  },
  signatureText: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
  // Page 2 - Patient summary
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 16,
  },
  instructionBox: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  instructionDrug: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1d4ed8",
    marginBottom: 2,
  },
  instructionText: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
  },
  disclaimer: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    padding: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  disclaimerText: {
    fontSize: 8,
    color: "#991b1b",
  },
  aiLabel: {
    fontSize: 7,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 4,
  },
});

interface PrescriptionPDFProps {
  consultation: Consultation;
}

export function PrescriptionPDF({ consultation }: PrescriptionPDFProps) {
  const date = new Date(consultation.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`MedScript AI Prescription - ${consultation.patientName}`}
      author="MedScript AI"
    >
      {/* PAGE 1 — Clinical Note */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MedScript AI</Text>
            <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 2 }}>
              Voice-First Clinical Documentation
            </Text>
          </View>
          <View>
            <Text style={styles.clinicInfo}>Date: {date}</Text>
            <Text style={styles.clinicInfo}>HITL Verified Prescription</Text>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.patientBox}>
          <View style={styles.patientField}>
            <Text style={styles.patientLabel}>Patient Name</Text>
            <Text style={styles.patientValue}>{consultation.patientName}</Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.patientLabel}>Age</Text>
            <Text style={styles.patientValue}>{consultation.patientAge} years</Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.patientLabel}>Gender</Text>
            <Text style={[styles.patientValue, { textTransform: "capitalize" }]}>
              {consultation.patientGender}
            </Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.patientLabel}>Status</Text>
            <Text style={styles.patientValue}>HITL Approved</Text>
          </View>
        </View>

        {/* SOAP Note */}
        <Text style={styles.sectionTitle}>Clinical SOAP Note</Text>

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

        {/* Prescribed Drugs */}
        {consultation.prescribedDrugs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Prescribed Medications</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.col1]}>Drug</Text>
                <Text style={[styles.tableHeaderCell, styles.col2]}>Brand</Text>
                <Text style={[styles.tableHeaderCell, styles.col3]}>Dosage</Text>
                <Text style={[styles.tableHeaderCell, styles.col4]}>Frequency</Text>
                <Text style={[styles.tableHeaderCell, styles.col5]}>Duration</Text>
                <Text style={[styles.tableHeaderCell, styles.col6]}>Price (INR)</Text>
              </View>
              {consultation.prescribedDrugs.map((drug, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.col1]}>{drug.name}</Text>
                  <Text style={[styles.tableCell, styles.col2]}>{drug.brandName}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>{drug.dosage}</Text>
                  <Text style={[styles.tableCell, styles.col4]}>{drug.frequency}</Text>
                  <Text style={[styles.tableCell, styles.col5]}>{drug.duration}</Text>
                  <Text style={[styles.tableCell, styles.col6]}>{drug.price ?? "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* AI Diagnosis (labeled) */}
        {consultation.diagnosisSuggestions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Decision Support</Text>
            <Text style={styles.aiLabel}>
              AI-generated differential diagnoses — For Doctor Reference Only
            </Text>
            {consultation.diagnosisSuggestions.slice(0, 3).map((d, i) => (
              <View key={i} style={styles.diagnosisBox}>
                <Text style={styles.diagnosisLabel}>
                  {i + 1}. {d.diagnosis}
                </Text>
                <Text style={styles.diagnosisConfidence}>
                  Confidence: {d.confidence}%
                </Text>
                <Text style={styles.diagnosisText}>{d.reasoning}</Text>
              </View>
            ))}
          </>
        )}

        {/* Referral */}
        {consultation.referralHospital && (
          <>
            <Text style={styles.sectionTitle}>Referral</Text>
            <View style={styles.referralBox}>
              <Text style={styles.referralTitle}>
                Refer to: {consultation.referralHospital.name}
              </Text>
              <Text style={styles.referralText}>
                Address: {consultation.referralHospital.address}
              </Text>
              <Text style={styles.referralText}>
                Specialty: {consultation.referralHospital.specialty}
              </Text>
              {consultation.referralHospital.contact && (
                <Text style={styles.referralText}>
                  Contact: {consultation.referralHospital.contact}
                </Text>
              )}
            </View>
          </>
        )}

        {/* Doctor Signature */}
        <View style={styles.signatureLine}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>Doctor Signature</Text>
            <Text style={styles.signatureText}>Date: {date}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated with MedScript AI | HITL Verified
          </Text>
          <Text style={styles.footerText}>Ref: {consultation._id}</Text>
        </View>
      </Page>

      {/* PAGE 2 — Patient Summary */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MedScript AI</Text>
          </View>
          <Text style={styles.clinicInfo}>{date}</Text>
        </View>

        <Text style={styles.summaryTitle}>Patient Prescription Summary</Text>
        <Text style={styles.summarySubtitle}>
          Easy-to-read instructions for {consultation.patientName}
        </Text>

        {/* Drug Instructions */}
        {consultation.prescribedDrugs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your Medicines</Text>
            {consultation.prescribedDrugs.map((drug, i) => (
              <View key={i} style={styles.instructionBox}>
                <Text style={styles.instructionDrug}>
                  {i + 1}. {drug.name} ({drug.brandName})
                </Text>
                <Text style={styles.instructionText}>
                  Take {drug.dosage} — {drug.frequency}
                </Text>
                <Text style={styles.instructionText}>
                  Continue for: {drug.duration}
                </Text>
                {drug.availability && (
                  <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 2 }}>
                    Availability: {drug.availability}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Referral */}
        {consultation.referralHospital && (
          <>
            <Text style={styles.sectionTitle}>You Are Being Referred To</Text>
            <View style={styles.referralBox}>
              <Text style={styles.referralTitle}>
                {consultation.referralHospital.name}
              </Text>
              <Text style={styles.referralText}>
                {consultation.referralHospital.address}
              </Text>
              {consultation.referralHospital.contact && (
                <Text style={styles.referralText}>
                  Call: {consultation.referralHospital.contact}
                </Text>
              )}
            </View>
          </>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            IMPORTANT: This prescription was generated with AI assistance and reviewed
            and approved by a qualified medical doctor. Do not change your medicine
            without consulting your doctor. If you experience side effects, contact
            your doctor immediately.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated with MedScript AI | HITL Verified
          </Text>
          <Text style={styles.footerText}>Page 2 of 2</Text>
        </View>
      </Page>
    </Document>
  );
}
