import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-svh flex flex-col">
      {/* Navbar */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-primary">MedScript AI</span>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-20 text-center max-w-3xl">
          <div className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
            AI-Powered Clinical Documentation
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Voice-first documentation for{" "}
            <span className="text-primary">Indian healthcare</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mb-10 leading-relaxed">
            MedScript AI converts doctor-patient conversations into structured SOAP notes,
            diagnosis suggestions, and prescriptions — in seconds, with human-in-the-loop review.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/sign-up">
              <Button size="lg" className="px-8">
                Get Started Free
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="px-8">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
            {[
              {
                title: "Voice Transcription",
                description:
                  "Record consultations in any Indian language. AI transcribes and structures the conversation automatically.",
              },
              {
                title: "SOAP Notes & Diagnosis",
                description:
                  "Generate clinical SOAP notes with differential diagnoses powered by RAG over medical guidelines.",
              },
              {
                title: "HITL Review",
                description:
                  "Doctors review flagged suggestions before approval. Every decision is audited and traceable.",
              },
            ].map((f) => (
              <div key={f.title} className="border rounded-lg p-5 bg-card">
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} MedScript AI. Built for Bharat.
      </footer>
    </div>
  );
}
