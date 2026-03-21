import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDoctorByClerkId, getPatientsByDoctor } from "@workspace/db";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Users,
  AlertTriangle,
  ArrowRight,
  Search,
  UserPlus,
  Calendar,
} from "lucide-react";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const doctor = await getDoctorByClerkId(userId);
  if (!doctor) redirect("/onboard");

  const { search } = await searchParams;
  const patients = await getPatientsByDoctor(doctor.id, search).catch(() => []);

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} treated
          </p>
        </div>
        <Link href="/consult">
          <Button className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            New Consultation
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search patients by name…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </form>

      {patients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium mb-1">
            {search ? `No patients found for "${search}"` : "No patients yet"}
          </p>
          <p className="text-xs mb-4">
            {search
              ? "Try a different search term"
              : "Start a consultation to add your first patient"}
          </p>
          {!search && (
            <Link href="/consult">
              <Button variant="outline" size="sm" className="gap-2">
                <UserPlus className="h-3.5 w-3.5" />
                Start a Consultation
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl border bg-background transition-all hover:shadow-sm group ${
                p.isCritical
                  ? "border-amber-300 bg-amber-50/30 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-950/20"
                  : "hover:border-primary/30"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  p.isCritical
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>

              {/* Patient info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{p.name}</span>
                  {p.isCritical && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Attention Required</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.age}Y &nbsp;·&nbsp; <span className="capitalize">{p.gender}</span>
                  {p.bloodGroup ? ` · ${p.bloodGroup}` : ""}
                  {p.allergies.length > 0 ? ` · Allergies: ${p.allergies.slice(0, 2).join(", ")}${p.allergies.length > 2 ? "…" : ""}` : ""}
                </p>
                {p.isCritical && p.criticalNote && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 truncate">
                    Note: {p.criticalNote}
                  </p>
                )}
              </div>

              {/* Meta */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                Last seen{" "}
                {new Date(p.lastSeenAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>

              <Badge variant="outline" className="shrink-0 hidden sm:inline-flex">
                {p.totalVisits} visit{p.totalVisits !== 1 ? "s" : ""}
              </Badge>

              <Link href={`/patients/${p.id}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs h-7 text-muted-foreground group-hover:text-foreground shrink-0"
                >
                  View History <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
