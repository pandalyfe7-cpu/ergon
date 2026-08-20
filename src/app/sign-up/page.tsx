import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthShell title="Create your log.">
      <SignUpForm />
    </AuthShell>
  );
}
