"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Pill,
  FileText,
  Calendar,
  ArrowLeft,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { PatientProfile, Consultation } from "@workspace/types";

interface WatchToggleProps {
  patientId: string;
  isCritical: boolean;
  criticalNote: string | null;
  onToggle: (val: boolean, note: string) => void;
}

function WatchToggle({ patientId, isCritical, criticalNote, onToggle }: WatchToggleProps) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(criticalNote ?? "");
  const [showInput, setShowInput] = useState(false);

  const toggle = async () => {
    if (!isCritical && !showInput) {
      setShowInput(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/watch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCritical: !isCritical, criticalNote: note || undefined }),
      });
      if (res.ok) {
        onToggle(!isCritical, note);
        setShowInput(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {showInput && !isCritical && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a clinical note (optional)…"
          className="w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
          autoFocus
        />
      )}
      <Button
        size="sm"
        variant={isCritical ? "outline" : "outline"}
        className={
          isCritical
            ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-2"
            : "border-amber-300 text-amber-700 hover:bg-amber-50 gap-2"
        }
        onClick={toggle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5" />
        )}
        {isCritical ? "Remove from Watch" : "Keep an Eye On"}
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: Consultation["status"] }) {
  const configs = {
    draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    in_review: { label: "In Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Approved", className: "bg-blue-50 text-blue-700 border-blue-200" },
    finalized: { label: "Finalized", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };
  const c = configs[status];
  return <Badge className={c.className} variant="outline">{c.label}</Badge>;
}

function ConsultationCard({ c }: { c: Consultation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <StatusBadge status={c.status} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(c.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <p className="text-sm font-medium truncate">
            {c.soapNote.assessment || "Assessment pending"}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t bg-muted/10">
          <div className="grid gap-4 pt-4">
            {/* SOAP */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Clinical Notes
              </p>
              <div className="space-y-2 text-sm">
                {(["subjective", "objective", "assessment", "plan"] as const).map((s) => (
                  <div key={s} className="flex gap-3">
                    <span className="text-muted-foreground capitalize min-w-[80px] shrink-0">{s}</span>
                    <p className="text-foreground leading-relaxed">{c.soapNote[s] || "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Drugs */}
            {c.prescribedDrugs.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5" /> Medications ({c.prescribedDrugs.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {c.prescribedDrugs.map((d, i) => (
                      <div key={i} className="text-xs border rounded-md px-2.5 py-1.5 bg-background">
                        <span className="font-medium">{d.name}</span>
                        <span className="text-muted-foreground"> · {d.dosage} · {d.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Diagnoses */}
            {c.diagnosisSuggestions.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Diagnoses
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.diagnosisSuggestions.map((d, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {d.diagnosis}
                        <span className="ml-1 text-muted-foreground">{d.confidence}%</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* View button */}
            <div className="flex justify-end">
              <Link href={`/consult/${c.id}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Eye className="h-3.5 w-3.5" /> Open Consultation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientHealthPage() {
  const params = useParams();
  const patientId = params["id"] as string;

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/patients/${patientId}/history`);
        if (!res.ok) throw new Error("Failed to load patient");
        const data = await res.json() as { patient: PatientProfile; consultations: Consultation[] };
        setPatient(data.patient);
        setConsultations(data.consultations);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-4xl flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="text-center py-16 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{error ?? "Patient not found"}</p>
        </div>
      </div>
    );
  }

  const handleWatchToggle = (val: boolean, note: string) => {
    setPatient((p) => p ? { ...p, isCritical: val, criticalNote: note || null } : p);
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl space-y-6">
      {/* Back */}
      <Link href="/patients">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All Patients
        </Button>
      </Link>

      {/* Patient profile card */}
      <div className={`p-5 rounded-xl border ${patient.isCritical ? "border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20" : "bg-card"}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${patient.isCritical ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{patient.name}</h1>
                {patient.isCritical && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 gap-1">
                    <AlertTriangle className="h-3 w-3" /> Attention Required
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {patient.age} years · <span className="capitalize">{patient.gender}</span>
                {patient.bloodGroup ? ` · ${patient.bloodGroup}` : ""}
                {patient.phone ? ` · ${patient.phone}` : ""}
              </p>
              {patient.allergies.length > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠ Allergies: {patient.allergies.join(", ")}
                </p>
              )}
              {patient.isCritical && patient.criticalNote && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Clinical note: {patient.criticalNote}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link href={`/consult?patientId=${patient.id}`}>
              <Button size="sm" className="gap-1.5 w-full sm:w-auto">
                <UserPlus className="h-3.5 w-3.5" /> New Consultation
              </Button>
            </Link>
            <WatchToggle
              patientId={patient.id}
              isCritical={patient.isCritical}
              criticalNote={patient.criticalNote}
              onToggle={handleWatchToggle}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Visits", value: consultations.length },
          {
            label: "Approved",
            value: consultations.filter((c) => c.status === "approved" || c.status === "finalized").length,
          },
          {
            label: "Pending Review",
            value: consultations.filter((c) => c.status === "in_review").length,
          },
          {
            label: "Unresolved Flags",
            value: consultations.reduce(
              (acc, c) => acc + c.hitlFlags.filter((f) => !f.resolved).length,
              0
            ),
          },
        ].map((s) => (
          <Card key={s.label} className="border shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">{s.label}</CardDescription>
              <CardTitle className="text-2xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Consultation timeline */}
      <Card className="border shadow-none">
        <CardHeader className="px-5 pb-3">
          <CardTitle className="text-base font-semibold">Consultation History</CardTitle>
          <CardDescription className="text-xs">
            {consultations.length} total · most recent first
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {consultations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">No consultations on record for this patient.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => (
                <ConsultationCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
