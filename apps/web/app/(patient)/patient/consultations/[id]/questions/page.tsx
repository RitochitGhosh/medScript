"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  ArrowLeft,
  Send,
  Loader2,
  MessageCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import type { ConsultationQuestion } from "@workspace/types";

export default function ConsultationQAPage() {
  const params = useParams();
  const consultationId = params["id"] as string;

  const [questions, setQuestions] = useState<ConsultationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/consultation/${consultationId}/questions`);
        if (!res.ok) throw new Error("Failed to load questions");
        const data = await res.json() as { questions: ConsultationQuestion[] };
        // Reverse to show oldest first (API returns newest first)
        setQuestions(data.questions.reverse());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [consultationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [questions]);

  const submit = async () => {
    const q = input.trim();
    if (!q || q.length < 5) return;

    setSubmitting(true);
    setInput("");
    try {
      const res = await fetch(`/api/consultation/${consultationId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      const data = await res.json() as { question: ConsultationQuestion };
      setQuestions((prev) => [...prev, data.question]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl flex flex-col" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/patient/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs -ml-2 text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Ask About Your Consultation</h1>
          <p className="text-xs text-muted-foreground">AI-powered answers based on your clinical notes</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-primary/8 border border-primary/20 mb-4">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-primary/90 leading-relaxed">
          Answers are generated from your consultation notes for educational purposes only.
          Always follow your doctor&apos;s instructions. For urgent concerns, contact your doctor directly.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0" style={{ maxHeight: "calc(100vh - 300px)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{error}</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium mb-1">No questions yet</p>
            <p className="text-xs">Ask anything about your diagnosis, medications, or treatment plan.</p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground/70 text-left max-w-xs mx-auto">
              <p className="px-3 py-2 bg-muted rounded-lg">Why was I prescribed this medication?</p>
              <p className="px-3 py-2 bg-muted rounded-lg">What does my diagnosis mean?</p>
              <p className="px-3 py-2 bg-muted rounded-lg">How long should I take this medicine?</p>
            </div>
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="space-y-3">
              {/* Patient question */}
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                  {q.question}
                </div>
              </div>
              {/* AI answer */}
              {q.answer && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-card border rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
                    {q.answer}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your diagnosis, medications, or treatment…"
          rows={2}
          disabled={submitting}
          className="flex-1 resize-none px-3 py-2.5 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
        />
        <Button
          onClick={submit}
          disabled={submitting || input.trim().length < 5}
          className="h-10 w-10 p-0 rounded-xl shrink-0"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
