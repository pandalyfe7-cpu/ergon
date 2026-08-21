import Link from "next/link";

import { AuthContinueWith, AuthFrame } from "@/components/auth/auth-shell";
import { buttonClass } from "@/components/ui";

export default function WelcomePage() {
  return (
    <AuthFrame>
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
      </div>

      <AuthContinueWith />
    </AuthFrame>
  );
}
