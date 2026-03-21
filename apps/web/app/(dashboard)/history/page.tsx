import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { getDoctorByClerkId, getConsultationsByDoctor } from "@workspace/db";
import type { ConsultationStatus } from "@workspace/types";
import { ClipboardList, Plus, ArrowRight, Calendar } from "lucide-react";

function StatusBadge({ status }: { status: ConsultationStatus }) {
  const configs: Record<ConsultationStatus, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
    },
    in_review: {
      label: "In Review",
      className:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
    },
    approved: {
      label: "Approved",
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
    },
    finalized: {
      label: "Finalized",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
    },
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
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultation History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {consultations.length} total consultation{consultations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/consult" className="shrink-0">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Consultation
          </Button>
        </Link>
      </div>

      {consultations.length === 0 ? (
        <Card className="border shadow-none">
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/25" />
            <p className="text-sm font-medium mb-1">No consultations yet</p>
            <p className="text-xs text-muted-foreground mb-5">
              Your consultation history will appear here.
            </p>
            <Link href="/consult">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Start your first consultation
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {consultations.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-background hover:border-primary/30 hover:bg-muted/20 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="font-semibold text-sm">{c.patientName}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.patientAge}Y &nbsp;·&nbsp; {c.patientGender}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate leading-relaxed">
                  {c.soapNote.assessment || "Assessment pending"}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={c.status} />
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(c.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <Link href={`/consult/${c.id}`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs h-7 text-muted-foreground group-hover:text-foreground"
                  >
                    View
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
