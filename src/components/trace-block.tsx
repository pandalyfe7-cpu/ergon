"use client";

import { useState } from "react";

import type { StoredProvenance } from "@/lib/today/provenance";

export function TraceBlock({ provenance }: { provenance: StoredProvenance }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-text-mid hover:text-text-hi text-xs"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Trace
      </button>
      {open && (
        <pre className="border-border bg-surface-2 text-text-low num mt-2 rounded-control border p-2 text-xs whitespace-pre-wrap">
          {`${provenance.rule_id}@${provenance.rule_version}\n`}
          {provenance.trace
            .flatMap((entry) => entry.rows)
            .join("\n")}
        </pre>
      )}
    </div>
  );
}
