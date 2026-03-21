import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { SignOutButton } from "@clerk/nextjs";
import { getDoctorByClerkId } from "@workspace/db";
import { Stethoscope } from "lucide-react";
import { NavLinks } from "@/components/dashboard/nav-links";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const doctor = await getDoctorByClerkId(userId);
  if (!doctor) redirect("/onboard");

  const initials = doctor.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-svh flex flex-col bg-muted/20">
      {/* Navbar */}
      <header className="border-b bg-background sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <Stethoscope className="h-5 w-5 text-primary" />
              <span className="font-bold text-base tracking-tight">MedScript AI</span>
            </Link>
            <NavLinks />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                {initials}
              </div>
              <div className="text-right">
                <p className="text-xs font-medium leading-none">{doctor.name}</p>
                {doctor.specialization && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {doctor.specialization}
                  </p>
                )}
              </div>
            </div>
            <div className="w-px h-5 bg-border hidden md:block" />
            <SignOutButton redirectUrl="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
                Sign Out
              </Button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
