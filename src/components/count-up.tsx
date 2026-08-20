"use client";

/**
 * Signature moment 3 (constitution §7): hero metric values count from previous
 * to current over 300ms on load. Reduced motion renders the final value
 * instantly.
 */

import { useEffect, useRef, useState } from "react";

import { formatNumber } from "@/lib/format";

export function CountUp({
  value,
  from,
  decimals = 1,
  className,
}: {
  value: number;
  /** Previous value to count from; defaults to the current value (no motion). */
  from?: number;
  decimals?: number;
  className?: string;
}) {
  const start = from ?? value;
  const [shown, setShown] = useState(start);
  const frame = useRef(0);

  // Prop changes (e.g. router.refresh) restart the count from the new start.
  const [prev, setPrev] = useState({ start, value });
  if (prev.start !== start || prev.value !== value) {
    setPrev({ start, value });
    setShown(start);
  }

  useEffect(() => {
    if (start === value) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (reduced) {
        setShown(value);
        return;
      }
      const progress = Math.min((now - t0) / 300, 1);
      // Standard entrance feel: fast start, settled end.
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(start + (value - start) * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [start, value]);

  return <span className={className}>{formatNumber(shown, decimals)}</span>;
}
