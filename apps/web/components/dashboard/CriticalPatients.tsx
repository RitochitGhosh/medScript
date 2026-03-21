import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

interface CriticalEntry {
  patientId: string;
  patientName: string;
  consultationId: string;
  unresolvedFlags: number;
  lastUpdated: Date;
}

interface Props {
  patients: CriticalEntry[];
}

export function CriticalPatients({ patients }: Props) {
  if (patients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
        <p className="text-sm font-medium">All clear</p>
        <p className="text-xs mt-0.5">No consultations with unresolved flags</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {patients.map((p) => (
        <div
          key={p.consultationId}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{p.patientName}</p>
            <p className="text-xs text-muted-foreground">
              Last updated{" "}
              {new Date(p.lastUpdated).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400"
          >
            {p.unresolvedFlags} flag{p.unresolvedFlags !== 1 ? "s" : ""}
          </Badge>
          <Link href={`/consult/${p.consultationId}`}>
            <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs shrink-0">
              Review <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}
