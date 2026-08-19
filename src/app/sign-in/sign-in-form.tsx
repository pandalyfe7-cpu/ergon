"use client";

import { useActionState } from "react";

import { Button, FIELD_CLASS } from "@/components/ui";

import { authenticate } from "./actions";

const FIELD = `${FIELD_CLASS} text-sm`;

export function SignInForm() {
  const [state, formAction, pending] = useActionState(authenticate, {
    message: null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-fg-dim text-xs tracking-widest uppercase">Email</span>
        <input name="email" type="email" required autoComplete="email" className={FIELD} />
      </label>

      <label className="block space-y-1">
        <span className="text-fg-dim text-xs tracking-widest uppercase">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={FIELD}
        />
      </label>

      {state.message ? (
        <p className="text-status-red text-xs">{state.message}</p>
      ) : null}

      <Button
        type="submit"
        name="intent"
        value="signin"
        variant="primary"
        disabled={pending}
        className="w-full"
      >
        Sign in
      </Button>

      <Button
        type="submit"
        name="intent"
        value="create"
        variant="quiet"
        disabled={pending}
        className="w-full"
      >
        Create account
      </Button>
    </form>
  );
}
