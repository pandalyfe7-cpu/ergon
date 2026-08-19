"use client";

/**
 * Toasts (constitution §5): bottom-right on desktop, bottom on mobile, one
 * line. Success toasts auto-dismiss after 4s. Failure toasts persist, name
 * what broke, and carry retry.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Toast = {
  id: number;
  message: string;
  variant: "ok" | "error";
  retry?: () => void;
};

type ToastApi = {
  /** One-line confirmation; auto-dismisses in 4s. */
  toast: (message: string) => void;
  /** Persistent failure naming what broke, with optional retry. */
  fail: (message: string, retry?: () => void) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast requires ToastProvider");
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: Toast["variant"], retry?: () => void) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant, retry }]);
      if (variant === "ok") {
        setTimeout(() => dismiss(id), 4000);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast: (message) => push(message, "ok"),
      fail: (message, retry) => push(message, "error", retry),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end lg:bottom-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            className={
              "toast-in pointer-events-auto flex max-w-full items-center gap-3 " +
              "rounded-card border bg-surface-2 py-2.5 pr-2.5 pl-4 text-sm shadow-overlay " +
              (t.variant === "error" ? "border-negative/60" : "border-border")
            }
          >
            <span className={t.variant === "error" ? "text-negative" : "text-text-hi"}>
              {t.message}
            </span>
            {t.variant === "error" && t.retry && (
              <button
                className="press rounded-control border-border text-text-hi hover:bg-surface border px-2.5 py-1 text-sm font-medium"
                onClick={() => {
                  dismiss(t.id);
                  t.retry?.();
                }}
              >
                Retry
              </button>
            )}
            {t.variant === "error" && (
              <button
                aria-label="Dismiss"
                className="text-text-mid hover:text-text-hi px-1"
                onClick={() => dismiss(t.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
                  <path strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
