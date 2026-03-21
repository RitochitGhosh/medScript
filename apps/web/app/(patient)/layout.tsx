import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { SignOutButton } from "@clerk/nextjs";
import { getPatientByClerkId } from "@workspace/db";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const patient = await getPatientByClerkId(userId);
  if (!patient) redirect("/onboard");

  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/patient/dashboard" className="font-bold text-lg text-primary">
              MedScript AI
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link href="/patient/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                My Prescriptions
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:block">{patient.name}</span>
            <Separator orientation="vertical" className="h-5 hidden md:block" />
            <SignOutButton redirectUrl="/">
              <Button variant="ghost" size="sm">Sign Out</Button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
