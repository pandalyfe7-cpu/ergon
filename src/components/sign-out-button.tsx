"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui";
import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="quiet"
      className="shrink-0"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
    >
      Sign out
    </Button>
  );
}
