"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Copy, Check } from "lucide-react";

export function CopyPatientId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={copy}
      className="shrink-0 h-8 w-8 p-0"
      title="Copy Patient ID"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
