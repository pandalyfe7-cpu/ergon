"use client";

import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="bg-background/80 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
    >
      <div
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="border-border bg-surface-overlay w-full max-w-md rounded-lg border p-4"
      >
        <h2 className="text-text-mid mb-3 text-xs font-medium tracking-widest uppercase">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
