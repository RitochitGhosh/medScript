import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { getDoctorByClerkId, getConsultationsByDoctor } from "@workspace/db";
import type { ConsultationStatus } from "@workspace/types";

function StatusBadge({ status }: { status: ConsultationStatus }) {
  const configs: Record<ConsultationStatus, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
    in_review: { label: "In Review", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
    finalized: { label: "Finalized", className: "bg-green-100 text-green-700" },
  };
  const config = configs[status];
  return (
    <Badge className={config.className} variant="outline">
      {config.label}
    </Badge>
  );
}

export default async function HistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const doctor = await getDoctorByClerkId(userId);
  if (!doctor) redirect("/onboard");

  const consultations = await getConsultationsByDoctor(doctor.id, 50).catch(() => []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Consultation History</h1>
          <p className="text-muted-foreground text-sm">{consultations.length} total consultations</p>
        </div>
        <Link href="/consult">
          <Button>+ New Consultation</Button>
        </Link>
      </div>

      {consultations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No consultations yet.</p>
            <Link href="/consult" className="mt-4 inline-block">
              <Button>Start your first consultation</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {consultations.map((c) => (
            <Card key={c.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{c.patientName}</span>
                      <span className="text-muted-foreground text-sm">
                        {c.patientAge}Y / {c.patientGender}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.soapNote.assessment || "Assessment pending"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <Link href={`/consult/${c.id}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
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
