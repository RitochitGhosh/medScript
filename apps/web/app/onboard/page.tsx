"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

type Role = "doctor" | "patient";

export default function OnboardPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Doctor fields
  const [specialization, setSpecialization] = useState("General Medicine");
  const [clinicName, setClinicName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Patient fields
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setLoading(true);

    const body =
      role === "doctor"
        ? { role, specialization, clinicName, licenseNumber }
        : { role, name: patientName, age: Number(age), gender, phone, bloodGroup };

    const res = await fetch("/api/user/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Onboarding failed");
      setLoading(false);
      return;
    }

    window.location.href = role === "doctor" ? "/dashboard" : "/patient/dashboard";
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">MedScript AI</h1>
          <p className="text-muted-foreground text-sm mt-1">Let's set up your account</p>
        </div>

        {/* Role selection */}
        {!role && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setRole("doctor")}
              className="border rounded-xl p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <div className="text-4xl mb-3">🩺</div>
              <div className="font-semibold">I am a Doctor</div>
              <div className="text-xs text-muted-foreground mt-1">
                Create consultations, manage patients
              </div>
            </button>
            <button
              onClick={() => setRole("patient")}
              className="border rounded-xl p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <div className="text-4xl mb-3">🧑‍⚕️</div>
              <div className="font-semibold">I am a Patient</div>
              <div className="text-xs text-muted-foreground mt-1">
                View your prescriptions & history
              </div>
            </button>
          </div>
        )}

        {/* Doctor form */}
        {role === "doctor" && (
          <Card>
            <CardHeader>
              <CardTitle>Doctor Profile</CardTitle>
              <CardDescription>Complete your professional details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="General Medicine"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clinic / Hospital Name</Label>
                  <Input
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="City Hospital, Mumbai"
                  />
                </div>
                <div className="space-y-2">
                  <Label>License Number (optional)</Label>
                  <Input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="MCI-XXXXXX"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setRole(null)}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Patient form */}
        {role === "patient" && (
          <Card>
            <CardHeader>
              <CardTitle>Patient Profile</CardTitle>
              <CardDescription>Your details help doctors provide better care</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Rahul Sharma"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      min={1}
                      max={150}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as typeof gender)}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Blood Group (optional)</Label>
                  <Input
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    placeholder="A+"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setRole(null)}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading || !patientName || !age}>
                    {loading ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
