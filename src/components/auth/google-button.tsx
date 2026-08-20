"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

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
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={pending}
        onClick={continueWithGoogle}
      >
        Continue with Google
      </Button>
      {error ? (
        <p className="text-negative text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
