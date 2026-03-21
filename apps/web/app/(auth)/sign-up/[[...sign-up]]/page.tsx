import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/30 p-4">
      <SignUp />
    </div>
  );
}
