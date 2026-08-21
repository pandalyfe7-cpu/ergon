"use client";

import { useState, useTransition } from "react";

import { cx } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/** Official Google G. OAuth-only constitution exception: brand mark, not UI chrome. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.55-5.17 3.55-8.87"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27A7.21 7.21 0 0 1 4.89 12c0-.79.14-1.55.38-2.27V6.62H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.33.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75"
      />
    </svg>
  );
}

export function GoogleButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function continueWithGoogle() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) {
        setError("Continue with Google did not finish.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label="Continue with Google"
        disabled={pending}
        onClick={continueWithGoogle}
        className={cx(
          "press border-border bg-surface hover:bg-surface-2 rounded-control",
          "inline-flex size-11 items-center justify-center border",
          "transition-colors duration-120",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <GoogleMark />
      </button>
      {error ? (
        <p className="text-negative text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
