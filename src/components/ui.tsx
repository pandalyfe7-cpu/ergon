import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

import { formatConstraintBadge, type ExerciseConstraint } from "@/lib/types";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Card: surface, 1px border, 16px padding, 10px radius (constitution §5). */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx("border-border bg-surface rounded-card border p-4", className)}
    >
      {children}
    </section>
  );
}

/** Legacy name used by screens not yet rebuilt. New code uses Card. */
export const Panel = Card;

/** Section label: Inter 12/500, uppercase, 0.06em tracking, text-mid (§3). */
export const SECTION_LABEL_CLASS =
  "text-text-mid text-xs font-medium tracking-[0.06em] uppercase";

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className={SECTION_LABEL_CLASS}>{children}</h2>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "destructive" | "quiet";
};

const BUTTON_VARIANTS = {
  primary:
    "from-accent to-accent-deep text-bg bg-linear-to-b font-medium " +
    "disabled:bg-none disabled:bg-surface-2 disabled:text-text-low",
  secondary:
    "border-border bg-surface text-text-hi hover:bg-surface-2 border " +
    "disabled:text-text-low",
  destructive:
    "border-negative/60 text-negative bg-surface hover:bg-surface-2 border " +
    "disabled:border-border disabled:text-text-low",
  quiet: "text-text-mid hover:text-text-hi bg-transparent disabled:text-text-low",
} as const;

/** Shared with links that act as buttons. */
export function buttonClass(
  variant: keyof typeof BUTTON_VARIANTS = "secondary",
  className?: string,
) {
  return cx(
    "press rounded-control inline-flex items-center justify-center gap-2 " +
      "px-3.5 py-2.5 text-sm font-medium transition-colors duration-120 " +
      "disabled:pointer-events-none",
    BUTTON_VARIANTS[variant],
    className,
  );
}

export function Button({ variant = "secondary", className, ...props }: ButtonProps) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

/**
 * Inputs: surface fill, border, focus glow on the wrapper's pseudo-element
 * (§5). Numeric fields are mono with tabular figures.
 */
export const FIELD_CLASS =
  "border-border bg-surface text-text-hi placeholder:text-text-low " +
  "rounded-control w-full border px-3 py-2 outline-none " +
  "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-0";

function FieldShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("glow-focus rounded-control block w-full", className)}>
      {children}
    </span>
  );
}

export function NumberField({
  className,
  shellClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { shellClassName?: string }) {
  return (
    <FieldShell className={shellClassName}>
      <input
        inputMode="decimal"
        autoComplete="off"
        {...props}
        className={cx(FIELD_CLASS, "num text-right text-sm", className)}
      />
    </FieldShell>
  );
}

export function TextField({
  className,
  shellClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { shellClassName?: string }) {
  return (
    <FieldShell className={shellClassName}>
      <input
        type="text"
        autoComplete="off"
        {...props}
        className={cx(FIELD_CLASS, "text-sm", className)}
      />
    </FieldShell>
  );
}

export function Select({
  className,
  shellClassName,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { shellClassName?: string }) {
  return (
    <FieldShell className={shellClassName}>
      <select {...props} className={cx(FIELD_CLASS, "text-sm", className)} />
    </FieldShell>
  );
}

/** Mono 12 chip for estimated time, target metric, rule ids (§5). */
export function Chip({
  children,
  tone = "mid",
  className,
  title,
}: {
  children: ReactNode;
  tone?: "mid" | "accent" | "positive" | "negative" | "warning";
  className?: string;
  title?: string;
}) {
  const tones = {
    mid: "text-text-mid border-border",
    accent: "text-accent border-accent/40",
    positive: "text-positive border-positive/40",
    negative: "text-negative border-negative/40",
    warning: "text-warning border-warning/40",
  } as const;
  return (
    <span
      title={title}
      className={cx(
        "num rounded-chip inline-flex items-center gap-1 border px-1.5 py-0.5 text-xs",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Skeleton block: surface-2 with a slow 1.5s shimmer, shaped by the caller (§6). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton", className)} />;
}

/** A filled track. Thin accent bar showing progress toward a target (§5). */
export function Meter({
  value,
  max,
  tone = "accent",
  className,
}: {
  value: number;
  max: number;
  /** `neutral` and `over` are legacy names used by screens not yet rebuilt. */
  tone?: "accent" | "positive" | "negative" | "warning" | "neutral" | "over";
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const tones = {
    accent: "bg-accent",
    positive: "bg-positive",
    negative: "bg-negative",
    warning: "bg-warning",
    neutral: "bg-accent",
    over: "bg-negative",
  } as const;
  return (
    <div
      className={cx("bg-surface-2 h-1.5 w-full overflow-hidden rounded-full", className)}
    >
      <div className={cx("h-full", tones[tone])} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

export function ConstraintBadges({
  constraints,
}: {
  constraints: ExerciseConstraint[];
}) {
  if (constraints.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {constraints.map((constraint, index) => (
        <li
          key={`${constraint.type}-${index}`}
          title={constraint.note ?? undefined}
          className="border-border text-text-mid num rounded-chip border px-1.5 py-0.5 text-xs tracking-wider"
        >
          {formatConstraintBadge(constraint)}
        </li>
      ))}
    </ul>
  );
}

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5">
      <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
      <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="m5 13 4.5 4.5L19 7" />
    </svg>
  );
}

/** Marks a warm-up row in place of a set number. */
export function WarmupIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="text-text-mid mx-auto size-3.5"
      aria-label="Warm-up"
    >
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 16 12 8l8 8" />
    </svg>
  );
}
