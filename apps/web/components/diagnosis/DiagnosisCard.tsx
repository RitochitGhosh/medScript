"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { BookOpen } from "lucide-react";
import type { DiagnosisSuggestion } from "@workspace/types";

interface DiagnosisCardProps {
  diagnosis: DiagnosisSuggestion;
  rank: number;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 80) {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200">
        {confidence}% Confidence
      </Badge>
    );
  }
  if (confidence >= 50) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        {confidence}% Confidence
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200">
      {confidence}% Confidence
    </Badge>
  );
}

export function DiagnosisCard({ diagnosis, rank }: DiagnosisCardProps) {
  const [expanded, setExpanded] = useState(rank === 1);

  return (
    <Card className={rank === 1 ? "border-primary/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center">
              {rank}
            </span>
            <CardTitle className="text-base">{diagnosis.diagnosis}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {diagnosis.ragEnriched && (
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1 px-1.5 py-0.5"
                title="Supported by medical knowledge base"
              >
                <BookOpen className="h-2.5 w-2.5" />
                Evidence-based
              </Badge>
            )}
            <ConfidenceBadge confidence={diagnosis.confidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Reasoning (collapsible) */}
        <div>
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
            Clinical Reasoning
          </button>
          {expanded && (
            <p className="text-sm text-muted-foreground mt-1 pl-5">
              {diagnosis.reasoning}
            </p>
          )}
        </div>

        {/* Recommended Tests */}
        {diagnosis.recommendedTests.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Recommended Tests
            </p>
            <div className="flex flex-wrap gap-1">
              {diagnosis.recommendedTests.map((test, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {test}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {diagnosis.redFlags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-red-600 mb-1">Red Flags</p>
            <div className="flex flex-wrap gap-1">
              {diagnosis.redFlags.map((flag, i) => (
                <Badge
                  key={i}
                  className="text-xs bg-red-50 text-red-700 border-red-200"
                >
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* View Guidelines */}
        {diagnosis.guidelineUrl && (
          <Sheet>
            <SheetTrigger>
              <span className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer">
                View Treatment Guidelines
              </span>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Treatment Guidelines</SheetTitle>
                <SheetDescription>{diagnosis.diagnosis}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {diagnosis.guidelineSummary && (
                  <div className="rounded-lg bg-muted p-4 text-sm">
                    <p className="font-medium mb-2">Summary</p>
                    <p className="text-muted-foreground">{diagnosis.guidelineSummary}</p>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => window.open(diagnosis.guidelineUrl, "_blank")}
                >
                  Open Full Guidelines
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </CardContent>
    </Card>
  );
}
