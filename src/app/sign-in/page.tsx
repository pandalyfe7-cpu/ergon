import { Panel } from "@/components/ui";

import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <h1 className="mb-4 text-lg font-semibold">Ergon</h1>
      <Panel>
        <SignInForm />
      </Panel>
    </main>
  );
}
