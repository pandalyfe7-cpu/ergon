import { Card } from "@/components/ui";

import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-text-hi mb-1 text-xl font-semibold">ERGOS</h1>
      <p className="text-text-mid mb-4 text-sm">Sign in to your log.</p>
      <Card>
        <SignInForm />
      </Card>
    </main>
  );
}
