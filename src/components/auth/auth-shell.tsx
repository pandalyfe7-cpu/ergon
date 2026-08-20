import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-text-hi mb-1 text-xl font-semibold">ERGOS</h1>
      <p className="text-text-mid mb-4 text-sm">{title}</p>
      <Card>{children}</Card>
    </main>
  );
}

export function AuthDivider() {
  return <p className="text-text-low my-3 text-center text-xs">or</p>;
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
