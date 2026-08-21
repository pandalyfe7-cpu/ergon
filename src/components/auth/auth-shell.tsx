import Link from "next/link";
import type { ReactNode } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { Card, SectionLabel } from "@/components/ui";

/** Centered public column: 320px stack in the middle of the viewport. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <AuthFrame>
      <h1 className="text-text-hi mb-1 text-xl font-semibold">ERGOS</h1>
      <p className="text-text-mid mb-4 text-sm">{title}</p>
      <Card>{children}</Card>
    </AuthFrame>
  );
}

export function AuthContinueWith() {
  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <SectionLabel>or continue with</SectionLabel>
      <GoogleButton />
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className="mt-3 text-center">
      <Link href={href} className="text-text-mid hover:text-text-hi text-sm">
        {children}
      </Link>
    </p>
  );
}
