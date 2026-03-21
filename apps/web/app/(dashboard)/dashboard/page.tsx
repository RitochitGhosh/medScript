import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
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
import { getConsultationsByDoctor, getConsultationStats } from "@workspace/db";
import type { ConsultationStatus } from "@workspace/types";

function StatusBadge({ status }: { status: ConsultationStatus }) {
  const variants: Record<ConsultationStatus, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    in_review: "default",
    approved: "outline",
    finalized: "outline",
  };
  const labels: Record<ConsultationStatus, string> = {
    draft: "Draft",
    in_review: "In Review",
    approved: "Approved",
    finalized: "Finalized",
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const doctorId = (session.user as typeof session.user & { id: string }).id ?? "unknown";

  // Fetch data in parallel
  const [stats, consultations] = await Promise.all([
    getConsultationStats(doctorId).catch(() => ({
      total: 0,
      pendingReview: 0,
      completedToday: 0,
    })),
    getConsultationsByDoctor(doctorId, 10).catch(() => []),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}
          </p>
        </div>
        <Link href="/consult">
          <Button>+ New Consultation</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Consultations</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl text-amber-500">
              {stats.pendingReview}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Today</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {stats.completedToday}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Consultations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Consultations</CardTitle>
          <CardDescription>
            Your last {consultations.length} consultations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {consultations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No consultations yet.</p>
              <Link href="/consult" className="mt-2 inline-block">
                <Button variant="outline" size="sm" className="mt-2">
                  Start your first consultation
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.patientName}</TableCell>
                    <TableCell>
                      {c.patientAge}Y / {c.patientGender}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/consult/${c._id}`}>
                        <Button variant="ghost" size="sm">
                          View
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
  );
}
