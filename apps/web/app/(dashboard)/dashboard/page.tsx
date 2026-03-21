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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  getDoctorByClerkId,
  getConsultationsByDoctor,
  getConsultationStats,
  getConsultationActivity,
  getCriticalPatients,
} from "@workspace/db";
import type { ConsultationStatus } from "@workspace/types";
import { ClipboardList, Clock, CheckCircle2, Plus, ArrowRight, AlertTriangle, Timer } from "lucide-react";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { CriticalPatients } from "@/components/dashboard/CriticalPatients";

function StatusBadge({ status }: { status: ConsultationStatus }) {
  const configs: Record<ConsultationStatus, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
    },
    in_review: {
      label: "In Review",
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
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

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const doctor = await getDoctorByClerkId(userId);
  if (!doctor) redirect("/onboard");

  const [stats, consultations, activity, criticalPatients] = await Promise.all([
    getConsultationStats(doctor.id).catch(() => ({ total: 0, pendingReview: 0, completedToday: 0 })),
    getConsultationsByDoctor(doctor.id, 10).catch(() => []),
    getConsultationActivity(doctor.id, 365).catch(() => []),
    getCriticalPatients(doctor.id).catch(() => []),
  ]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = getGreeting(hour);

  const formattedDate = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const timeSavedMins = stats.approvedTotal * 10;
  const timeSavedHours = Math.floor(timeSavedMins / 60);
  const timeSavedRemMins = timeSavedMins % 60;
  const timeSavedLabel =
    timeSavedHours > 0
      ? timeSavedRemMins > 0
        ? `${timeSavedHours}h ${timeSavedRemMins}m`
        : `${timeSavedHours}h`
      : `${timeSavedMins}m`;

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-0.5">
            {formattedDate} &nbsp;·&nbsp; {formattedTime}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {greeting}, Dr. {doctor.name.split(" ")[0]}
          </h1>
          {doctor.specialization && (
            <p className="text-sm text-muted-foreground mt-1">{doctor.specialization}</p>
          )}
        </div>
        <Link href="/consult" className="shrink-0">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Consultation
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-none">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Total Consultations
              </CardDescription>
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight mt-1">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-none">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Pending Review
              </CardDescription>
              <div className="w-8 h-8 rounded-md bg-amber-100 flex items-center justify-center dark:bg-amber-950">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight mt-1 text-amber-600 dark:text-amber-400">
              {stats.pendingReview}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-none">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Completed Today
              </CardDescription>
              <div className="w-8 h-8 rounded-md bg-emerald-100 flex items-center justify-center dark:bg-emerald-950">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight mt-1 text-emerald-600 dark:text-emerald-500">
              {stats.completedToday}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-none bg-primary/5">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-primary/80">
                Time Saved
              </CardDescription>
              <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
                <Timer className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight mt-1 text-primary">
              {timeSavedMins === 0 ? "—" : timeSavedLabel}
            </CardTitle>
            <p className="text-[11px] text-primary/60 mt-0.5">vs manual documentation</p>
          </CardHeader>
        </Card>
      </div>

      {/* Activity Heatmap */}
      <Card className="border shadow-none">
        <CardHeader className="px-5 pb-3">
          <CardTitle className="text-base font-semibold">Consultation Activity</CardTitle>
          <CardDescription className="text-xs">Daily patient consultations — last 12 months</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ActivityHeatmap activity={activity} />
        </CardContent>
      </Card>

      {/* Attention Required + Recent Consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Attention Required */}
        <Card className="border shadow-none lg:col-span-2">
          <CardHeader className="px-5 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">Attention Required</CardTitle>
              {criticalPatients.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-auto bg-amber-50 text-amber-700 border-amber-200 text-xs"
                >
                  {criticalPatients.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Consultations with unresolved HITL flags
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <CriticalPatients patients={criticalPatients} />
          </CardContent>
        </Card>

        {/* Recent Consultations */}
        <Card className="border shadow-none lg:col-span-3">
          <CardHeader className="px-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Consultations</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Your last {consultations.length} consultations
                </CardDescription>
              </div>
              {consultations.length > 0 && (
                <Link href="/history">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {consultations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground px-6">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-25" />
                <p className="text-sm font-medium mb-1">No consultations yet</p>
                <Link href="/consult">
                  <Button variant="outline" size="sm" className="gap-2 mt-2">
                    <Plus className="h-3.5 w-3.5" /> Start First Consultation
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-t">
                    <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Patient
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date
                    </TableHead>
                    <TableHead className="pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultations.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-5 py-3">
                        <p className="font-medium text-sm">{c.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.patientAge}Y · {c.patientGender}
                        </p>
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground py-3">
                        {new Date(c.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </TableCell>
                      <TableCell className="pr-5 py-3 text-right">
                        <Link href={`/consult/${c.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7">
                            View <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
