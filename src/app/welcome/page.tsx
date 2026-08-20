import Link from "next/link";

import { GoogleButton } from "@/components/auth/google-button";
import { buttonClass } from "@/components/ui";

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="text-text-low text-xs font-medium tracking-[0.06em] uppercase">ERGOS</p>
      <h1 className="text-text-hi mt-3 text-xl font-semibold">What is worth doing today?</h1>
      <p className="text-text-mid mt-2 text-sm">
        Log fast, see the next action, keep the data.
      </p>

      <div className="mt-8 space-y-3">
        <Link href="/sign-up" className={buttonClass("primary", "w-full")}>
          Create account
        </Link>
        <Link href="/sign-in" className={buttonClass("secondary", "w-full")}>
          Sign in
        </Link>
        <GoogleButton />
      </div>
    </main>
  );
}
