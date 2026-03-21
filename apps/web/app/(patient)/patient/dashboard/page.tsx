import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { getPatientByClerkId, getConsultationsByPatient } from "@workspace/db";
import type { ConsultationStatus } from "@workspace/types";

function StatusBadge({ status }: { status: ConsultationStatus }) {
  const configs: Record<ConsultationStatus, { label: string; className: string }> = {
    draft: { label: "In Progress", className: "bg-gray-100 text-gray-600" },
    in_review: { label: "Under Review", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Ready", className: "bg-blue-100 text-blue-700" },
    finalized: { label: "Finalized", className: "bg-green-100 text-green-700" },
  };
  const config = configs[status];
  return <Badge className={config.className} variant="outline">{config.label}</Badge>;
}

export default async function PatientDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const patient = await getPatientByClerkId(userId);
  if (!patient) redirect("/onboard");

  const consultations = await getConsultationsByPatient(patient.id, 20).catch(() => []);
  const approved = consultations.filter((c) => c.status === "approved" || c.status === "finalized");

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Patient ID card */}
      <Card className="mb-8 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardDescription>Your Patient ID</CardDescription>
          <CardTitle className="font-mono text-sm break-all">{patient.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Share this ID with your doctor when starting a new consultation.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Visits</CardDescription>
            <CardTitle className="text-3xl">{consultations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prescriptions Ready</CardDescription>
            <CardTitle className="text-3xl text-green-600">{approved.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Your Consultations</h2>

      {consultations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No consultations yet. Share your Patient ID with your doctor to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {consultations.map((c) => (
            <Card key={c.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">
                      {c.soapNote.assessment || "Assessment pending"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={c.status} />
                    {(c.status === "approved" || c.status === "finalized") && (
                      <Link href={`/patient/prescriptions/${c.id}`}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
