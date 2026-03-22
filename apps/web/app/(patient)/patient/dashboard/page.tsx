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
import { Separator } from "@workspace/ui/components/separator";
import { getPatientByClerkId, getConsultationsByPatient } from "@workspace/db";
import type { ConsultationStatus } from "@workspace/types";
import {
  Copy,
  User,
  Droplets,
  AlertTriangle,
  Calendar,
  MessageCircle,
  Eye,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { CopyPatientId } from "./copy-id";

function StatusBadge({ status }: { status: ConsultationStatus }) {
  const configs: Record<ConsultationStatus, { label: string; className: string }> = {
    draft: { label: "In Progress", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    in_review: { label: "Under Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Ready", className: "bg-blue-50 text-blue-700 border-blue-200" },
    finalized: { label: "Finalized", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };
  const config = configs[status];
  return (
    <Badge className={config.className} variant="outline">
      {config.label}
    </Badge>
  );
}

export default async function PatientDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const patient = await getPatientByClerkId(userId);
  if (!patient) redirect("/onboard");

  const consultations = await getConsultationsByPatient(patient.id, 30).catch(() => []);
  const approved = consultations.filter(
    (c) => c.status === "approved" || c.status === "finalized"
  );

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl space-y-6">
      {/* Profile Card */}
      <Card className="border shadow-none">
        <CardContent className="pt-5 pb-5 px-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold tracking-tight">{patient.name}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {patient.age} years · <span className="capitalize">{patient.gender}</span>
                </span>
                {patient.bloodGroup && (
                  <span className="flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5" />
                    {patient.bloodGroup}
                  </span>
                )}
                {patient.phone && <span>{patient.phone}</span>}
              </div>
              {patient.allergies.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Allergies: {patient.allergies.join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Patient Code */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Your Patient Code
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded-lg tracking-widest text-foreground text-center">
                {patient.patientCode}
              </code>
              <CopyPatientId id={patient.patientCode} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Share this 6-character code with your doctor when starting a new consultation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">Total Visits</CardDescription>
              <ClipboardList className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <CardTitle className="text-3xl font-bold">{consultations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">Prescriptions Ready</CardDescription>
              <CheckCircle2 className="h-4 w-4 text-emerald-500/70" />
            </div>
            <CardTitle className="text-3xl font-bold text-emerald-600">{approved.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Consultations */}
      <div>
        <h2 className="text-base font-semibold mb-3">Your Consultations</h2>

        {consultations.length === 0 ? (
          <Card className="border shadow-none">
            <CardContent className="py-14 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">No consultations yet</p>
              <p className="text-xs">Share your Patient ID with your doctor to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {consultations.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-card hover:border-primary/30 hover:bg-muted/10 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {c.soapNote.assessment || "Assessment pending"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(c.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  <Link href={`/patient/consultations/${c.id}/questions`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 h-7 text-xs text-muted-foreground group-hover:text-foreground"
                      title="Ask a question"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Ask</span>
                    </Button>
                  </Link>
                  {(c.status === "approved" || c.status === "finalized") && (
                    <Link href={`/patient/prescriptions/${c.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
