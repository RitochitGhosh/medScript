"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import type { PrescribedDrug } from "@workspace/types";

// Indian medical frequency abbreviations
const FREQ_OPTIONS = [
  { value: "OD",   label: "OD — Once Daily" },
  { value: "BD",   label: "BD — Twice Daily" },
  { value: "TDS",  label: "TDS — Thrice Daily" },
  { value: "QID",  label: "QID — Four Times Daily" },
  { value: "SOS",  label: "SOS — As Needed" },
  { value: "HS",   label: "HS — At Bedtime" },
  { value: "AC",   label: "AC — Before Meals" },
  { value: "PC",   label: "PC — After Meals" },
  { value: "STAT", label: "STAT — Immediately" },
];

const PERIOD_OPTIONS = [
  { value: "day",   label: "/ day" },
  { value: "week",  label: "/ week" },
  { value: "month", label: "/ month" },
];

type DrugState = {
  qty: number;
  unit: string;
  step: number;
  abbrev: string;
  period: string;
};

function parseNumericDosage(dosage: string): { qty: number; unit: string; step: number } {
  const m = dosage.match(/^([\d.]+)\s*(.*)/);
  if (!m) return { qty: 1, unit: dosage, step: 1 };
  const qty = parseFloat(m[1]!);
  const unit = m[2]!.trim();
  const u = unit.toLowerCase();
  let step = 1;
  if (u.includes("mcg")) step = 25;
  else if (u.includes("mg")) step = qty >= 250 ? 50 : qty >= 100 ? 25 : 5;
  else if (u.includes("ml")) step = 5;
  else step = 0.5; // tablets/capsules
  return { qty, unit, step };
}

function parseFreqAndPeriod(freq: string): { abbrev: string; period: string } {
  const upper = freq.toUpperCase();
  let period = "day";
  if (upper.includes("MONTH")) period = "month";
  else if (upper.includes("WEEK")) period = "week";
  for (const opt of FREQ_OPTIONS) {
    if (upper.startsWith(opt.value)) return { abbrev: opt.value, period };
  }
  return { abbrev: "OD", period };
}

interface DrugDosageEditorProps {
  drugs: PrescribedDrug[];
  onChange: (updated: PrescribedDrug[]) => void;
}

export function DrugDosageEditor({ drugs, onChange }: DrugDosageEditorProps) {
  const [states, setStates] = useState<DrugState[]>(() =>
    drugs.map((d) => {
      const { qty, unit, step } = parseNumericDosage(d.dosage);
      const { abbrev, period } = parseFreqAndPeriod(d.frequency);
      return { qty, unit, step, abbrev, period };
    })
  );

  function buildUpdatedDrugs(index: number, s: DrugState): PrescribedDrug[] {
    const drug = drugs[index]!;
    const newDosage = `${s.qty}${s.unit ? " " + s.unit : ""}`.trim();
    const periodSuffix = s.period !== "day" ? ` / ${s.period}` : "";
    const newFreq = `${s.abbrev}${periodSuffix}`;
    return drugs.map((d, i) => (i === index ? { ...d, dosage: newDosage, frequency: newFreq } : d));
  }

  function adjustQty(index: number, delta: number) {
    const s = states[index]!;
    const newQty = Math.max(s.step, Math.round((s.qty + delta * s.step) * 100) / 100);
    const newState = { ...s, qty: newQty };
    setStates((prev) => prev.map((item, i) => (i === index ? newState : item)));
    onChange(buildUpdatedDrugs(index, newState));
  }

  function setAbbrev(index: number, abbrev: string) {
    const newState = { ...states[index]!, abbrev };
    setStates((prev) => prev.map((item, i) => (i === index ? newState : item)));
    onChange(buildUpdatedDrugs(index, newState));
  }

  function setPeriod(index: number, period: string) {
    const newState = { ...states[index]!, period };
    setStates((prev) => prev.map((item, i) => (i === index ? newState : item)));
    onChange(buildUpdatedDrugs(index, newState));
  }

  if (drugs.length === 0) return null;

  return (
    <div className="space-y-3">
      {drugs.map((drug, i) => {
        const s = states[i]!;
        return (
          <div key={i} className="border rounded-lg p-3 bg-background space-y-2.5">
            {/* Drug header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{drug.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{drug.brandName}</p>
              </div>
              {drug.price && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  ₹{drug.price}
                </Badge>
              )}
            </div>

            {/* Dosage row: − qty unit + */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">Dose</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 text-base leading-none"
                onClick={() => adjustQty(i, -1)}
              >
                −
              </Button>
              <span className="text-sm font-mono font-medium min-w-[80px] text-center tabular-nums">
                {s.qty}&nbsp;{s.unit}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 text-base leading-none"
                onClick={() => adjustQty(i, 1)}
              >
                +
              </Button>
            </div>

            {/* Frequency row: abbrev + period */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground w-10 shrink-0">Freq</span>
              <Select value={s.abbrev} onValueChange={(v) => setAbbrev(i, v)}>
                <SelectTrigger className="h-7 text-xs w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQ_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={s.period} onValueChange={(v) => setPeriod(i, v)}>
                <SelectTrigger className="h-7 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">For</span>
              <span className="text-xs text-foreground">{drug.duration}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
