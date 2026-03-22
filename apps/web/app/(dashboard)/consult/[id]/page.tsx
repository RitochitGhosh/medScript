"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { SoapEditor } from "@/components/soap-note/SoapEditor";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { DosageCalculator } from "@/components/diagnosis/DosageCalculator";
import { HospitalCard } from "@/components/referral/HospitalCard";
import type { Consultation, SoapNote, HitlFlag, Hospital, PrescribedDrug, AuditLogEntry } from "@workspace/types";

export default function ConsultReviewPage() {
  const params = useParams();
  const consultationId = params["id"] as string;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soapNote, setSoapNote] = useState<SoapNote | null>(null);
  const [hitlFlags, setHitlFlags] = useState<HitlFlag[]>([]);
  const [drugs, setDrugs] = useState<PrescribedDrug[]>([]);
  const [referralHospital, setReferralHospital] = useState<Hospital | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalSummary, setHospitalSummary] = useState<string | null>(null);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [geoCity, setGeoCity] = useState("Mumbai");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    async function fetchConsultation() {
      try {
        const res = await fetch(`/api/consultation/${consultationId}`);
        if (!res.ok) throw new Error("Failed to fetch consultation");
        const data = (await res.json()) as Consultation;
        setConsultation(data);
        setSoapNote(data.soapNote);
        setHitlFlags(data.hitlFlags);
        setDrugs(data.prescribedDrugs);
        if (data.status === "approved" || data.status === "finalized") setApproved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load consultation");
      } finally {
        setLoading(false);
      }
    }
    fetchConsultation();
  }, [consultationId]);

  const unresolvedCount = hitlFlags.filter((f) => !f.resolved).length;
  const canApprove = unresolvedCount === 0;

  function handleFlagResolved(index: number, doctorEdit: string) {
    setHitlFlags((prev) =>
      prev.map((f, i) => (i === index ? { ...f, resolved: true, doctorEdit } : f))
    );

    // Audit log
    const flag = hitlFlags[index];
    if (flag) {
      fetch("/api/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId,
          action: `resolve_flag_${flag.section}`,
          aiSuggested: flag.reason,
          doctorApproved: doctorEdit,
        }),
      }).catch(console.error);
    }
  }

  async function handleApproveAndPdf() {
    setApproving(true);
    try {
      // First save HITL flag resolutions
      await fetch(`/api/consultation/${consultationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hitlFlags, soapNote }),
      });
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
      setApproving(false);
      return;
    }
    setApproving(false);

    // Generate PDF
    setGeneratingPdf(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "PDF generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescription-${consultationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setGeneratingPdf(false);
    }
  }

  const searchHospitals = useCallback(async (specialty: string) => {
    setLoadingHospitals(true);
    try {
      let lat = 19.0760;
      let lng = 72.8777;
      let city = geoCity;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Use defaults
        }
      }

      const res = await fetch("/api/hospital-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty, lat, lng, city }),
      });

      if (!res.ok) throw new Error("Hospital search failed");
      const data = (await res.json()) as { hospitals: Hospital[]; summary?: string };
      setHospitals(data.hospitals);
      setHospitalSummary(data.summary ?? null);
    } catch (err) {
      console.error("Hospital search error:", err);
    } finally {
      setLoadingHospitals(false);
    }
  }, [geoCity]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error && !consultation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!consultation || !soapNote) return null;

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold">{consultation.patientName}</h1>
            <p className="text-sm text-muted-foreground">
              {consultation.patientAge}Y / {consultation.patientGender} •{" "}
              {new Date(consultation.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <Badge
            variant={
              consultation.status === "finalized"
                ? "default"
                : consultation.status === "approved"
                ? "outline"
                : "secondary"
            }
            className="capitalize"
          >
            {consultation.status}
          </Badge>
        </div>
        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — SOAP Note Editor */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SOAP Note</CardTitle>
            </CardHeader>
            <CardContent>
              <SoapEditor
                soapNote={soapNote}
                hitlFlags={hitlFlags}
                onChange={setSoapNote}
                onFlagResolved={handleFlagResolved}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right — AI Assistance Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Assistance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="diagnosis">
                <TabsList className="w-full rounded-none border-b">
                  <TabsTrigger value="diagnosis" className="flex-1 text-xs">
                    Diagnosis
                  </TabsTrigger>
                  <TabsTrigger value="drugs" className="flex-1 text-xs">
                    Drugs
                  </TabsTrigger>
                  <TabsTrigger value="referral" className="flex-1 text-xs">
                    Refer
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="flex-1 text-xs">
                    Audit
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Diagnosis */}
                <TabsContent value="diagnosis" className="p-4">
                  <ScrollArea className="h-[500px] pr-3">
                    {consultation.diagnosisSuggestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No diagnosis suggestions generated yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          AI-generated differential diagnoses — for doctor reference only
                        </p>
                        {consultation.diagnosisSuggestions.map((d, i) => (
                          <DiagnosisCard key={i} diagnosis={d} rank={i + 1} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Tab 2: Drugs */}
                <TabsContent value="drugs" className="p-4">
                  <ScrollArea className="h-[500px] pr-3">
                    {drugs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No drugs prescribed in this consultation.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {/* Drug interaction warnings */}
                        {consultation.diagnosisSuggestions.some(
                          (d) => d.redFlags.length > 0
                        ) && (
                          <Alert variant="destructive">
                            <AlertDescription className="text-sm">
                              Review red flags in diagnosis panel before prescribing.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-xs text-muted-foreground">
                                <th className="text-left py-1 pr-2">Drug</th>
                                <th className="text-left py-1 pr-2">Brand</th>
                                <th className="text-left py-1 pr-2">Dose</th>
                                <th className="text-left py-1 pr-2">Freq</th>
                                <th className="text-left py-1 pr-2">Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {drugs.map((drug, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="py-2 pr-2 font-medium">{drug.name}</td>
                                  <td className="py-2 pr-2 text-muted-foreground">
                                    {drug.brandName}
                                  </td>
                                  <td className="py-2 pr-2">{drug.dosage}</td>
                                  <td className="py-2 pr-2">{drug.frequency}</td>
                                  <td className="py-2 pr-2 text-xs text-muted-foreground">
                                    {drug.price ?? "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Dosage calculator */}
                        <DosageCalculator
                          patientAge={consultation.patientAge}
                          prescribedDrugNames={drugs.map((d) => d.name)}
                        />
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Tab 3: Referral */}
                <TabsContent value="referral" className="p-4">
                  <ScrollArea className="h-[500px] pr-3">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="City (e.g. Mumbai)"
                          value={geoCity}
                          onChange={(e) => setGeoCity(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const specialty =
                              consultation.diagnosisSuggestions[0]?.diagnosis ??
                              "general medicine";
                            searchHospitals(specialty);
                          }}
                          disabled={loadingHospitals}
                        >
                          {loadingHospitals ? "Searching..." : "Search"}
                        </Button>
                      </div>

                      {referralHospital && (
                        <Alert className="border-green-300 bg-green-50">
                          <AlertDescription className="text-green-700 text-sm">
                            Referral added: <strong>{referralHospital.name}</strong>
                          </AlertDescription>
                        </Alert>
                      )}

                      {loadingHospitals ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24" />
                          ))}
                        </div>
                      ) : hospitals.length > 0 ? (
                        <div className="space-y-3">
                          {hospitalSummary && (
                            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
                                Tavily Web Summary
                              </p>
                              <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                                {hospitalSummary}
                              </p>
                            </div>
                          )}
                          {hospitals.map((hospital, i) => (
                            <HospitalCard
                              key={i}
                              hospital={hospital}
                              onAddToReferral={(h) => setReferralHospital(h)}
                              isSelected={referralHospital?.name === hospital.name}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Search for hospitals near the patient&apos;s location.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Tab 4: Audit Trail */}
                <TabsContent value="audit" className="p-4">
                  <ScrollArea className="h-[500px] pr-3">
                    {consultation.auditLog.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <p className="text-sm font-medium mb-1">No audit entries yet</p>
                        <p className="text-xs">Audit entries are created when you resolve HITL flags.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          Complete record of AI suggestions and doctor edits for this consultation.
                        </p>
                        {(consultation.auditLog as AuditLogEntry[]).map((entry, i) => (
                          <div key={i} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-foreground capitalize">
                                {entry.action.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(entry.timestamp).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-md bg-amber-50 border border-amber-100 px-2.5 py-1.5">
                                <p className="text-[10px] font-medium text-amber-700 mb-0.5">AI Suggested</p>
                                <p className="text-xs text-amber-900 leading-snug">{entry.aiSuggested || "—"}</p>
                              </div>
                              <div className="rounded-md bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
                                <p className="text-[10px] font-medium text-emerald-700 mb-0.5">Doctor Approved</p>
                                <p className="text-xs text-emerald-900 leading-snug">{entry.doctorApproved || "—"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-3 z-40">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {unresolvedCount > 0 ? (
              <Badge variant="secondary" className="text-amber-600 bg-amber-50">
                {unresolvedCount} flag{unresolvedCount > 1 ? "s" : ""} to resolve
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-700">All flags resolved</Badge>
            )}
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-muted-foreground">
              {hitlFlags.filter((f) => f.resolved).length}/{hitlFlags.length} resolved
            </span>
          </div>
          <Button
            disabled={!canApprove || approving || generatingPdf || approved}
            onClick={handleApproveAndPdf}
            className="min-w-[180px]"
          >
            {generatingPdf
              ? "Generating PDF..."
              : approving
              ? "Approving..."
              : approved
              ? "Approved & Downloaded"
              : "Approve & Generate PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
