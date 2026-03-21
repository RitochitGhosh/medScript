"use client";

import { useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { AlertTriangle, Calculator } from "lucide-react";

// Standard pediatric weight-based doses (mg/kg/day) for common drugs
const DOSAGE_TABLE: Record<string, { mgPerKg: number; maxDoseMg: number; unit: string; note?: string }> = {
  paracetamol: { mgPerKg: 15, maxDoseMg: 1000, unit: "mg", note: "every 6h" },
  acetaminophen: { mgPerKg: 15, maxDoseMg: 1000, unit: "mg", note: "every 6h" },
  ibuprofen: { mgPerKg: 10, maxDoseMg: 400, unit: "mg", note: "every 8h; avoid < 6 months" },
  amoxicillin: { mgPerKg: 25, maxDoseMg: 500, unit: "mg", note: "every 8h" },
  amoxicillin_clavulanate: { mgPerKg: 25, maxDoseMg: 625, unit: "mg", note: "every 8h (as amoxicillin component)" },
  azithromycin: { mgPerKg: 10, maxDoseMg: 500, unit: "mg", note: "once daily × 3 days" },
  cetirizine: { mgPerKg: 0.25, maxDoseMg: 10, unit: "mg", note: "once daily; ≥2 years" },
  metformin: { mgPerKg: 0, maxDoseMg: 500, unit: "mg", note: "Adults only — do not use in children < 10 years" },
  salbutamol: { mgPerKg: 0.1, maxDoseMg: 2.5, unit: "mg nebulised", note: "every 4–6h; weight-based for < 5 years" },
};

function normalizeKey(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "_");
}

interface Props {
  patientAge: number;
  prescribedDrugNames: string[];
}

export function DosageCalculator({ patientAge, prescribedDrugNames }: Props) {
  const [weight, setWeight] = useState<string>("");
  const [results, setResults] = useState<{ drug: string; dose: string; warning?: string }[]>([]);
  const [calculated, setCalculated] = useState(false);

  const isPediatric = patientAge < 18;
  const w = parseFloat(weight);

  function calculate() {
    if (!w || w <= 0) return;
    const out = prescribedDrugNames.map((drugName) => {
      const key = normalizeKey(drugName);
      const match = Object.entries(DOSAGE_TABLE).find(([k]) => key.includes(k) || k.includes(key.split("_")[0] ?? ""));
      if (!match) {
        return { drug: drugName, dose: "No weight-based data available", warning: "Consult drug formulary for pediatric dosing" };
      }
      const [, info] = match;
      if (info.mgPerKg === 0) {
        return { drug: drugName, dose: info.note ?? "Adult dose only", warning: "Not recommended for pediatric use" };
      }
      const calculated_dose = Math.min(w * info.mgPerKg, info.maxDoseMg);
      const roundedDose = Math.round(calculated_dose * 10) / 10;
      const warning = w * info.mgPerKg >= info.maxDoseMg ? `Capped at adult max dose (${info.maxDoseMg}${info.unit})` : undefined;
      return {
        drug: drugName,
        dose: `${roundedDose} ${info.unit}${info.note ? ` — ${info.note}` : ""}`,
        warning,
      };
    });
    setResults(out);
    setCalculated(true);
  }

  if (!isPediatric && prescribedDrugNames.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Dosage Calculator</p>
        {isPediatric && (
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
            Pediatric — {patientAge}y
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Weight-based dosing for {isPediatric ? "this pediatric patient" : "weight-adjusted dosing"}. Always verify with clinical judgment.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          max="200"
          step="0.5"
          value={weight}
          onChange={(e) => { setWeight(e.target.value); setCalculated(false); }}
          placeholder="Patient weight (kg)"
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button size="sm" onClick={calculate} disabled={!w || w <= 0} className="shrink-0 h-8">
          Calculate
        </Button>
      </div>
      {calculated && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.drug} className="rounded-md border bg-background px-3 py-2">
              <p className="text-xs font-semibold text-foreground mb-0.5">{r.drug}</p>
              <p className="text-xs text-muted-foreground">{r.dose}</p>
              {r.warning && (
                <p className="flex items-center gap-1 text-[10px] text-amber-700 mt-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {r.warning}
                </p>
              )}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            * Doses calculated at standard mg/kg ranges. Adjust for renal/hepatic impairment and clinical context.
          </p>
        </div>
      )}
    </div>
  );
}
