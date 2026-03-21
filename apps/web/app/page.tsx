import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  UserPlus,
  Mic,
  Sparkles,
  ShieldCheck,
  FileCheck,
  Stethoscope,
  Brain,
  ClipboardList,
  ChevronRight,
  Activity,
  X,
  Check,
} from "lucide-react";

const workflowSteps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Register or Find Patient",
    description:
      "Search for an existing patient by their unique Patient ID, or register a new patient with basic demographic details in seconds.",
  },
  {
    number: "02",
    icon: Mic,
    title: "Record the Consultation",
    description:
      "Press record and consult naturally. MedScript AI transcribes your conversation in real-time, with support for multiple Indian languages.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "AI Generates Clinical Notes",
    description:
      "Receive a structured SOAP note, differential diagnoses with confidence scores, and drug suggestions — generated from clinical guidelines in seconds.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Review AI Flags",
    description:
      "The Human-in-the-Loop system highlights uncertain findings. You read, verify, and resolve each flag before the note can be approved.",
  },
  {
    number: "05",
    icon: FileCheck,
    title: "Approve & Generate Prescription",
    description:
      "Once all flags are cleared, approve the consultation with one click and download a professional PDF prescription ready for your patient.",
  },
];

const features = [
  {
    icon: Mic,
    title: "Voice Transcription",
    description:
      "Record consultations in any Indian language. AI transcribes and structures the conversation automatically.",
  },
  {
    icon: Brain,
    title: "SOAP Notes & Diagnosis",
    description:
      "Generate structured clinical SOAP notes with differential diagnoses powered by evidence-based medical guidelines.",
  },
  {
    icon: ClipboardList,
    title: "HITL Review",
    description:
      "Doctors review AI-flagged suggestions before final approval. Every decision is audited and fully traceable.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-svh flex flex-col">
      {/* Nav */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">MedScript AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 md:py-36">
          <div className="container mx-auto px-6 text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-primary/20 tracking-wide uppercase">
              <Activity className="h-3 w-3" />
              AI-Powered Clinical Documentation
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.08]">
              Clinical documentation,{" "}
              <br className="hidden md:block" />
              <span className="text-primary">reimagined for doctors</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl mb-12 leading-relaxed max-w-2xl mx-auto">
              MedScript AI converts doctor-patient conversations into structured SOAP notes,
              differential diagnoses, and prescriptions — in seconds, with human-in-the-loop review.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/sign-up">
                <Button size="lg" className="px-8 h-12 text-base gap-2">
                  Get Started Free
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="px-8 h-12 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 border-y bg-muted/30">
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="text-center mb-14">
              <p className="text-primary text-xs font-bold tracking-widest uppercase mb-3">
                Workflow
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                From consultation to prescription
              </h2>
              <p className="text-muted-foreground text-base max-w-xl mx-auto leading-relaxed">
                A seamless five-step process designed around how doctors actually work.
              </p>
            </div>

            <div className="space-y-3">
              {workflowSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="flex gap-5 p-6 rounded-xl bg-background border hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="shrink-0 flex flex-col items-center gap-2.5 pt-0.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-muted-foreground/60 tracking-wider">
                        {step.number}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1.5 tracking-tight">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">
                Built for clinical excellence
              </h2>
              <p className="text-muted-foreground">
                Every feature designed with the doctor&apos;s workflow in mind.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="border rounded-xl p-6 bg-card hover:border-primary/40 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2 tracking-tight">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Before / After */}
        <section className="py-20 border-y bg-muted/20">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="text-center mb-12">
              <p className="text-primary text-xs font-bold tracking-widest uppercase mb-3">
                Impact
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                15–20 minutes → 2–3 minutes
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-base leading-relaxed">
                For a doctor seeing 40 patients a day, MedScript AI saves over <strong>8 hours of paperwork</strong> — every single day.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Without */}
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-red-600 mb-4">Without MedScript AI</p>
                <ul className="space-y-3">
                  {[
                    { label: "Handwrite SOAP notes", time: "10 min" },
                    { label: "Manual diagnosis lookup", time: "5 min" },
                    { label: "Prescription writing", time: "5 min" },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <X className="h-3 w-3 text-red-500" />
                        </div>
                        <span className="text-sm text-foreground">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600 shrink-0">{item.time}</span>
                    </li>
                  ))}
                  <li className="pt-3 border-t border-red-200 flex items-center justify-between">
                    <span className="text-sm font-bold">Total per patient</span>
                    <span className="text-lg font-bold text-red-600">15–20 min</span>
                  </li>
                </ul>
              </div>

              {/* With */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-4">With MedScript AI</p>
                <ul className="space-y-3">
                  {[
                    { label: "Voice record consultation", time: "2 min" },
                    { label: "AI differential diagnosis", time: "Instant" },
                    { label: "Auto-generated prescription", time: "30 sec" },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                        <span className="text-sm text-foreground">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 shrink-0">{item.time}</span>
                    </li>
                  ))}
                  <li className="pt-3 border-t border-emerald-200 flex items-center justify-between">
                    <span className="text-sm font-bold">Total per patient</span>
                    <span className="text-lg font-bold text-emerald-600">2–3 min</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary">
          <div className="container mx-auto px-6 text-center max-w-xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-primary-foreground">
              Ready to transform your practice?
            </h2>
            <p className="text-primary-foreground/75 mb-8 text-base leading-relaxed">
              Join doctors across India using MedScript AI to document consultations faster and more
              accurately.
            </p>
            <Link href="/sign-up">
              <Button
                size="lg"
                variant="secondary"
                className="px-8 h-12 text-base gap-2"
              >
                Start for Free
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 bg-background">
        <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm tracking-tight">MedScript AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MedScript AI &mdash; Built for Bharat.
          </p>
        </div>
      </footer>
    </div>
  );
}
