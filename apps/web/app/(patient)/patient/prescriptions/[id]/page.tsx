import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getPatientByClerkId, getConsultationById, getDoctorById } from "@workspace/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";

export default async function PrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const patient = await getPatientByClerkId(userId);
  if (!patient) redirect("/onboard");

  const { id } = await params;
  const consultation = await getConsultationById(id);

  if (!consultation || consultation.patientId !== patient.id) notFound();

  const doctor = await getDoctorById(consultation.doctorId).catch(() => null);
  const { soapNote, diagnosisSuggestions, prescribedDrugs, createdAt } = consultation;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prescription</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">{consultation.status}</Badge>
      </div>

      {/* Doctor info */}
      {doctor && (
        <Card>
          <CardContent className="py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {doctor.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold">{doctor.name}</p>
              <p className="text-sm text-muted-foreground">
                {doctor.specialization ?? "Doctor"}
                {doctor.clinicName ? ` · ${doctor.clinicName}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-muted-foreground">Name</p><p className="font-medium">{consultation.patientName}</p></div>
          <div><p className="text-muted-foreground">Age</p><p className="font-medium">{consultation.patientAge} years</p></div>
          <div><p className="text-muted-foreground">Gender</p><p className="font-medium capitalize">{consultation.patientGender}</p></div>
        </CardContent>
      </Card>

      {/* SOAP Note */}
      <Card>
        <CardHeader><CardTitle>Clinical Notes</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {(["subjective", "objective", "assessment", "plan"] as const).map((section) => (
            <div key={section}>
              <p className="font-medium capitalize text-muted-foreground mb-1">{section}</p>
              <p className="whitespace-pre-wrap leading-relaxed">{soapNote[section] || "—"}</p>
              <Separator className="mt-4" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Prescriptions */}
      {prescribedDrugs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prescribed Medications</CardTitle>
            <CardDescription>{prescribedDrugs.length} medication(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prescribedDrugs.map((drug, i) => (
                <div key={i} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{drug.name} <span className="text-muted-foreground font-normal">({drug.brandName})</span></p>
                    {drug.price && <Badge variant="secondary">{drug.price}</Badge>}
                  </div>
                  <p className="text-muted-foreground">
                    {drug.dosage} &middot; {drug.frequency} &middot; {drug.duration}
                  </p>
                  {drug.availability && (
                    <p className="text-xs text-muted-foreground">Availability: {drug.availability}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnoses */}
      {diagnosisSuggestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Diagnosis</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {diagnosisSuggestions.map((d, i) => (
              <div key={i} className="border rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{d.diagnosis}</p>
                  <Badge variant="outline">{d.confidence}%</Badge>
                </div>
                <p className="text-muted-foreground text-xs">{d.reasoning}</p>
                {d.redFlags.length > 0 && (
                  <p className="text-xs text-red-600">Red flags: {d.redFlags.join(", ")}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
