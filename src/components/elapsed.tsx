"use client";

import { useEffect, useState } from "react";

import { formatElapsed } from "@/lib/time";

/** Ticks once a second. Renders nothing until mounted, to avoid a server mismatch. */
export function Elapsed({ since, className }: { since: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const started = new Date(since).getTime();
    const tick = () => setText(formatElapsed(Date.now() - started));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [since]);

  return <span className={className}>{text ?? "\u2014"}</span>;
}
