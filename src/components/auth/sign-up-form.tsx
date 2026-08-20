"use client";

import { useActionState } from "react";
import Link from "next/link";

import { GoogleButton } from "@/components/auth/google-button";
import { AuthDivider, AuthLink } from "@/components/auth/auth-shell";
import { Button, FIELD_CLASS } from "@/components/ui";
import { signUp } from "@/lib/auth/actions";

const FIELD = `${FIELD_CLASS} text-sm`;

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, { message: null });

  if (state.confirm) {
    return (
      <div className="space-y-3">
        <p className="text-text-hi text-sm">{state.message}</p>
        <Link href="/sign-in" className="text-accent text-sm hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

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
            autoComplete="new-password"
            className={FIELD}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-text-low text-xs tracking-widest uppercase">Confirm password</span>
          <input
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            className={FIELD}
          />
        </label>

        {state.message ? (
          <p className="text-negative text-xs" role="alert">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" variant="primary" disabled={pending} className="w-full">
          Create account
        </Button>
      </form>

      <AuthDivider />
      <GoogleButton />
      <AuthLink href="/sign-in">Sign in</AuthLink>
    </div>
  );
}
