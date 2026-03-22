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
import type { PatientProfile, PatientGender } from "@workspace/types";

type Step = 1 | 2 | 3;
interface ProcStep { label: string; done: boolean; }

export default function ConsultPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [patientIdInput, setPatientIdInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [foundPatient, setFoundPatient] = useState<PatientProfile | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // New patient form
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newGender, setNewGender] = useState<PatientGender>("male");
  const [newPhone, setNewPhone] = useState("");
  const [newBloodGroup, setNewBloodGroup] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);

  // Step 2
  const [transcript, setTranscript] = useState("");
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Step 3
  const initialProcSteps: ProcStep[] = [
    { label: "Generating SOAP Note...", done: false },
    { label: "Searching Drug Database...", done: false },
    { label: "Fetching Diagnosis Suggestions...", done: false },
    { label: "Saving to Records...", done: false },
  ];
  const [procSteps, setProcSteps] = useState<ProcStep[]>(initialProcSteps);

  const markDone = (i: number) =>
    setProcSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, done: true } : s)));
  const updateLabel = (i: number, label: string) =>
    setProcSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, label } : s)));

  async function handleLookup() {
    if (!patientIdInput.trim()) return;
    setLookupError(null);
    setFoundPatient(null);
    setLookingUp(true);
    try {
      const res = await fetch(`/api/patients/${patientIdInput.trim()}`);
      if (res.status === 404) {
        setLookupError("No patient found with this code. Register a new patient below.");
        setShowNewForm(true);
      } else if (!res.ok) {
        setLookupError("Lookup failed. Check the code and try again.");
      } else {
        setFoundPatient((await res.json()) as PatientProfile);
        setShowNewForm(false);
      }
    } catch {
      setLookupError("Network error.");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleCreatePatient() {
    setCreatingPatient(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, age: Number(newAge), gender: newGender, phone: newPhone || undefined, bloodGroup: newBloodGroup || undefined }),
      });
      if (!res.ok) throw new Error("Failed to create patient");
      setFoundPatient((await res.json()) as PatientProfile);
      setShowNewForm(false);
      setLookupError(null);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Failed to create patient");
    } finally {
      setCreatingPatient(false);
    }
  }

  async function generateNote() {
    if (!transcript.trim() || !foundPatient) return;
    setRecordingError(null);
    setProcSteps(initialProcSteps);
    setStep(3);

    try {
      const res = await fetch("/api/generate-note/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: foundPatient.id, transcript }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream connection failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let consultationId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace("event:", "").trim();
          const data = JSON.parse(dataLine.replace("data:", "").trim()) as {
            step?: number; label?: string; done?: boolean; consultationId?: string; message?: string;
          };

          if (event === "step" && data.step !== undefined && data.label) {
            if (data.done) {
              markDone(data.step);
            } else {
              updateLabel(data.step, data.label);
            }
          } else if (event === "done" && data.consultationId) {
            consultationId = data.consultationId;
            markDone(0); markDone(1); markDone(2); markDone(3);
          } else if (event === "error" && data.message) {
            throw new Error(data.message);
          }
        }
      }

      if (consultationId) {
        router.push(`/consult/${consultationId}`);
      }
    } catch (err) {
      setRecordingError(err instanceof Error ? err.message : "Processing failed");
      setStep(2);
    }
  }

  const stepTitles: Record<Step, string> = { 1: "Find Patient", 2: "Voice Recording", 3: "Processing" };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Consultation</h1>
        <p className="text-muted-foreground text-sm mt-1">Step {step} of 3 — {stepTitles[step]}</p>
        <Progress value={(step / 3) * 100} className="mt-3 h-1.5" />
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Find Patient</CardTitle>
              <CardDescription>Enter the patient&apos;s 6-character code. Patients can find their code in their dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Patient Code (e.g. A3X9M2)" value={patientIdInput} onChange={(e) => { setPatientIdInput(e.target.value); setFoundPatient(null); setLookupError(null); }} className="font-mono text-sm uppercase" onKeyDown={(e) => e.key === "Enter" && handleLookup()} />
                <Button onClick={handleLookup} disabled={!patientIdInput.trim() || lookingUp}>{lookingUp ? "..." : "Look Up"}</Button>
              </div>
              {lookupError && <Alert variant={showNewForm ? "default" : "destructive"}><AlertDescription>{lookupError}</AlertDescription></Alert>}
              {foundPatient && (
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20 space-y-1">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Patient found</p>
                  <p className="font-semibold">{foundPatient.name}</p>
                  <p className="text-sm text-muted-foreground">{foundPatient.age}Y &middot; {foundPatient.gender}{foundPatient.bloodGroup ? ` · ${foundPatient.bloodGroup}` : ""}</p>
                  {foundPatient.allergies.length > 0 && <p className="text-xs text-amber-600">Allergies: {foundPatient.allergies.join(", ")}</p>}
                  <Button className="w-full mt-2" onClick={() => setStep(2)}>Start Consultation</Button>
                </div>
              )}
              {!showNewForm && !foundPatient && (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowNewForm(true)}>+ Register a new patient</Button>
              )}
            </CardContent>
          </Card>

          {showNewForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Register New Patient</CardTitle>
                <CardDescription>A unique 6-character Patient Code will be generated — share it with the patient for future visits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Full Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Rahul Sharma" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Age</Label><Input type="number" min={1} max={150} value={newAge} onChange={(e) => setNewAge(e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <div className="flex gap-1">
                      {(["male", "female", "other"] as PatientGender[]).map((g) => (
                        <button key={g} type="button" onClick={() => setNewGender(g)} className={`flex-1 rounded-md border py-2 text-xs capitalize transition-colors ${newGender === g ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Phone</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+91 ..." /></div>
                  <div className="space-y-2"><Label>Blood Group</Label><Input value={newBloodGroup} onChange={(e) => setNewBloodGroup(e.target.value)} placeholder="A+" /></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowNewForm(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleCreatePatient} disabled={creatingPatient || !newName || !newAge}>{creatingPatient ? "Registering..." : "Register Patient"}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && foundPatient && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle>Voice Recording</CardTitle><CardDescription>Recording consultation with {foundPatient.name}</CardDescription></div>
              <div className="flex gap-2"><Badge variant="outline">{foundPatient.age}Y</Badge><Badge variant="outline" className="capitalize">{foundPatient.gender}</Badge></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recordingError && <Alert variant="destructive"><AlertDescription>{recordingError}</AlertDescription></Alert>}
            <VoiceRecorder onTranscriptReady={(t) => setTranscript(t)} disabled={false} />
            <div className="space-y-2">
              <Label>Transcript</Label>
              <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={8} placeholder="Transcript will appear here after recording. You can also type or edit it." className="font-mono text-sm" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={generateNote} disabled={!transcript.trim()}>Generate SOAP Note</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Processing Consultation</CardTitle><CardDescription>AI is generating clinical documentation</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {recordingError && <Alert variant="destructive"><AlertDescription>{recordingError}</AlertDescription></Alert>}
            <div className="space-y-3">
              {procSteps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  {s.done ? (
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0" />
                  )}
                  {s.done ? <span className="text-sm text-muted-foreground">{s.label}</span> : <Skeleton className="h-4 w-48" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
