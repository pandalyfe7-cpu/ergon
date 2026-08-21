"use client";

import { useActionState } from "react";

import { AuthContinueWith, AuthLink } from "@/components/auth/auth-shell";
import { Button, FIELD_CLASS } from "@/components/ui";
import { signIn } from "@/lib/auth/actions";

const FIELD = `${FIELD_CLASS} text-sm`;

export function SignInForm({ oauthError = false }: { oauthError?: boolean }) {
  const [state, formAction, pending] = useActionState(signIn, { message: null });

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-text-low text-xs tracking-widest uppercase">Email</span>
          <input name="email" type="email" required autoComplete="email" className={FIELD} />
        </label>

        <label className="block space-y-1">
          <span className="text-text-low text-xs tracking-widest uppercase">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={FIELD}
          />
        </label>

        {state.message ? (
          <p className="text-negative text-xs" role="alert">
            {state.message}
          </p>
        ) : oauthError ? (
          <p className="text-negative text-xs" role="alert">
            Continue with Google did not finish.
          </p>
        ) : null}

        <Button type="submit" variant="primary" disabled={pending} className="w-full">
          Sign in
        </Button>
      </form>

      <AuthContinueWith />
      <AuthLink href="/sign-up">Create account</AuthLink>
    </div>
  );
}
