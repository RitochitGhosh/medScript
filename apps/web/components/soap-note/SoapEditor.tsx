"use client";

import { useState } from "react";
import { Textarea } from "@workspace/ui/components/textarea";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Label } from "@workspace/ui/components/label";
import type { SoapNote, HitlFlag, HitlSection } from "@workspace/types";

interface SoapEditorProps {
  soapNote: SoapNote;
  hitlFlags: HitlFlag[];
  onChange: (updated: SoapNote) => void;
  onFlagResolved: (index: number, doctorEdit: string) => void;
}

const SECTIONS: Array<{ key: keyof SoapNote; label: string; section: HitlSection }> = [
  { key: "subjective", label: "Subjective", section: "subjective" },
  { key: "objective", label: "Objective", section: "objective" },
  { key: "assessment", label: "Assessment", section: "assessment" },
  { key: "plan", label: "Plan", section: "plan" },
];

export function SoapEditor({
  soapNote,
  hitlFlags,
  onChange,
  onFlagResolved,
}: SoapEditorProps) {
  const [values, setValues] = useState<SoapNote>(soapNote);

  function handleChange(key: keyof SoapNote, value: string) {
    const updated = { ...values, [key]: value };
    setValues(updated);
    onChange(updated);
  }

  function getFlagsForSection(section: HitlSection): Array<{ flag: HitlFlag; index: number }> {
    return hitlFlags
      .map((flag, index) => ({ flag, index }))
      .filter(({ flag }) => flag.section === section);
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map(({ key, label, section }) => {
        const sectionFlags = getFlagsForSection(section);
        const unresolvedFlags = sectionFlags.filter(({ flag }) => !flag.resolved);
        const hasUnresolved = unresolvedFlags.length > 0;

        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {values[key].length} chars
                </span>
                {hasUnresolved && (
                  <Badge variant="secondary" className="text-amber-600 bg-amber-50">
                    {unresolvedFlags.length} flag{unresolvedFlags.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* Flag alerts */}
            {unresolvedFlags.map(({ flag, index }) => (
              <Alert key={index} className="border-amber-200 bg-amber-50">
                <AlertDescription className="flex items-start justify-between gap-4">
                  <span className="text-amber-800 text-sm">{flag.reason}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100"
                    onClick={() => onFlagResolved(index, values[key])}
                  >
                    Resolve Flag
                  </Button>
                </AlertDescription>
              </Alert>
            ))}

            {/* Resolved flags */}
            {sectionFlags
              .filter(({ flag }) => flag.resolved)
              .map(({ flag, index }) => (
                <Alert key={index} className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-700 text-sm flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Flag resolved
                  </AlertDescription>
                </Alert>
              ))}

            <Textarea
              value={values[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              rows={4}
              className={
                hasUnresolved
                  ? "border-amber-300 focus-visible:ring-amber-400"
                  : ""
              }
              placeholder={`Enter ${label.toLowerCase()} section...`}
            />
          </div>
        );
      })}
    </div>
  );
}
