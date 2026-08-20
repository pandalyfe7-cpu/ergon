import type { MetricDaily } from "@/lib/ergos/data";

/**
 * Minimal server-rendered trend line. Gaps in the data break the line rather
 * than interpolating a value that was never logged. The target band renders
 * as a faint region so distance-from-target reads at a glance.
 */
export function Sparkline({
  daily,
  floor,
  ceiling,
}: {
  daily: MetricDaily[];
  floor: number;
  ceiling: number;
}) {
  const values = daily.map((d) => d.value).filter((v): v is number => v !== null);
  if (values.length === 0) return null;

  const lo = Math.min(...values, floor);
  const hi = Math.max(...values, ceiling);
  const span = hi - lo || 1;
  const pad = span * 0.1;
  const y = (v: number) => 30 - ((v - (lo - pad)) / (span + pad * 2)) * 28;
  const x = (i: number) => (daily.length === 1 ? 50 : (i / (daily.length - 1)) * 100);

  const segments: string[] = [];
  let current: string[] = [];
  daily.forEach((point, i) => {
    if (point.value === null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
      return;
    }
    current.push(`${x(i).toFixed(2)},${y(point.value).toFixed(2)}`);
  });
  if (current.length > 1) segments.push(current.join(" "));

  const dots = daily.flatMap((point, i) =>
    point.value === null ? [] : [{ cx: x(i), cy: y(point.value) }],
  );

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="h-10 w-full"
      aria-hidden="true"
    >
      <rect
        x="0"
        width="100"
        y={Math.min(y(floor), y(ceiling))}
        height={Math.abs(y(floor) - y(ceiling))}
        fill="var(--color-positive)"
        opacity="0.08"
      />
      {segments.map((points) => (
        <polyline
          key={points}
          points={points}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {segments.length === 0 &&
        dots.map((dot) => (
          <circle
            key={`${dot.cx}-${dot.cy}`}
            cx={dot.cx}
            cy={dot.cy}
            r="1.5"
            fill="var(--color-accent)"
          />
        ))}
    </svg>
  );
}
