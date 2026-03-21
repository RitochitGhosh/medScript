"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import type { PatientGender, Consultation } from "@workspace/types";

type Step = 1 | 2 | 3;

interface PatientInfo {
  name: string;
  age: string;
  gender: PatientGender | "";
  chiefComplaint: string;
}

interface ProcessingStep {
  label: string;
  done: boolean;
}

export default function ConsultPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: "",
    age: "",
    gender: "",
    chiefComplaint: "",
  });
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { label: "Generating SOAP Note...", done: false },
    { label: "Searching Drug Database...", done: false },
    { label: "Fetching Diagnosis Suggestions...", done: false },
    { label: "Saving to Records...", done: false },
  ]);

  function isPatientInfoValid() {
    return (
      patientInfo.name.trim() &&
      patientInfo.age &&
      Number(patientInfo.age) > 0 &&
      patientInfo.gender
    );
  }

  function handleTranscriptReady(t: string) {
    setTranscript(t);
  }

  async function generateNote() {
    if (!transcript.trim()) {
      setError("Transcript is empty. Please record or type the consultation.");
      return;
    }
    setError(null);
    setStep(3);

    // Simulate sequential processing steps
    const stepUpdater = async (index: number, delayMs: number) => {
      await new Promise((r) => setTimeout(r, delayMs));
      setProcessingSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, done: true } : s))
      );
    };

    try {
      // Step 0: generate note (takes the actual API call)
      const noteResponse = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          patientContext: {
            name: patientInfo.name,
            age: Number(patientInfo.age),
            gender: patientInfo.gender,
            chiefComplaint: patientInfo.chiefComplaint,
          },
        }),
      });

      if (!noteResponse.ok) {
        const data = (await noteResponse.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to generate note");
      }

      const noteData = (await noteResponse.json()) as { consultation: Consultation };
      const consultation = noteData.consultation;

      await stepUpdater(0, 100);

      // Step 1: drug enrichment (already done in generate-note, mark done)
      await stepUpdater(1, 500);

      // Step 2: diagnosis suggestions
      const symptoms =
        typeof consultation.soapNote.subjective === "string"
          ? [consultation.soapNote.subjective]
          : [];

      const diagResponse = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: consultation._id,
          symptoms,
          extractedData: { soapNote: consultation.soapNote },
        }),
      });

      if (!diagResponse.ok) {
        console.warn("Diagnosis generation failed, continuing without diagnoses");
      }

      await stepUpdater(2, 300);
      await stepUpdater(3, 300);

      // Navigate to HITL review
      router.push(`/consult/${consultation._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setStep(2);
    }
  }

  const stepTitles: Record<Step, string> = {
    1: "Patient Information",
    2: "Voice Recording",
    3: "Processing",
  };

  const progress = (step / 3) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Consultation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Step {step} of 3 — {stepTitles[step]}
        </p>
        <Progress value={progress} className="mt-3 h-1.5" />
      </div>

      {/* Step 1 — Patient Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>Enter patient details before starting the consultation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Patient Name</Label>
                <Input
                  id="name"
                  placeholder="Full name"
                  value={patientInfo.name}
                  onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="35"
                  min={0}
                  max={150}
                  value={patientInfo.age}
                  onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex gap-2">
                  {(["male", "female", "other"] as PatientGender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setPatientInfo({ ...patientInfo, gender: g })}
                      className={`flex-1 rounded-md border py-2 text-sm capitalize transition-colors ${
                        patientInfo.gender === g
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="complaint">Chief Complaint</Label>
                <Textarea
                  id="complaint"
                  placeholder="e.g., Fever for 3 days with headache..."
                  rows={3}
                  value={patientInfo.chiefComplaint}
                  onChange={(e) =>
                    setPatientInfo({ ...patientInfo, chiefComplaint: e.target.value })
                  }
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!isPatientInfoValid()}
              onClick={() => setStep(2)}
            >
              Start Recording
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Voice Recording */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Voice Recording</CardTitle>
                <CardDescription>
                  Record the consultation with {patientInfo.name}
                </CardDescription>
              </div>
              <div className="flex gap-2 text-sm">
                <Badge variant="outline">{patientInfo.age}Y</Badge>
                <Badge variant="outline" className="capitalize">
                  {patientInfo.gender}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <VoiceRecorder
              onTranscriptReady={handleTranscriptReady}
              disabled={false}
            />

            <div className="space-y-2">
              <Label>Transcript</Label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={8}
                placeholder="Transcript will appear here after recording. You can also type or edit it manually."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                You can edit the transcript before generating the note.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={generateNote}
                disabled={!transcript.trim()}
              >
                Generate SOAP Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Processing */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Consultation</CardTitle>
            <CardDescription>
              AI is analyzing the consultation and generating documentation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              {processingSteps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  {s.done ? (
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-green-600"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0" />
                  )}
                  {s.done ? (
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  ) : (
                    <Skeleton className="h-4 w-48" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
