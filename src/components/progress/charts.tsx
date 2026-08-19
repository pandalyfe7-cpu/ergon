import { tokens } from "@/lib/design/tokens";
import { formatMonthDay } from "@/lib/time";
import type { DayPoint } from "@/lib/progress/data";

/** Chart coordinate space. Scaled to the container, so these are ratios. */
const WIDTH = 320;
const HEIGHT = 96;
/** Keeps the line and its dots clear of the top and bottom edges. */
const PAD = 6;

/** Above this many days the per-day dots turn into noise. */
const DOT_LIMIT = 31;

type Plotted = { x: number; y: number; point: DayPoint };

function plot(points: DayPoint[], target: number | null) {
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]));
  if (values.length === 0) return null;

  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (target !== null) {
    lo = Math.min(lo, target);
    hi = Math.max(hi, target);
  }
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }

  const span = points.length > 1 ? points.length - 1 : 1;
  const y = (value: number) =>
    HEIGHT - PAD - ((value - lo) / (hi - lo)) * (HEIGHT - PAD * 2);

  const plotted: Plotted[] = points.flatMap((point, index) =>
    point.value === null
      ? []
      : [{ x: (index / span) * WIDTH, y: y(point.value), point }],
  );

  return { plotted, lo, hi, y, min: Math.min(...values), max: Math.max(...values) };
}

/**
 * A line over local days. Days without a value are gaps the line spans rather
 * than zeros, so a rest day does not read as a day of no food or no lifting.
 * Colors come from the tokens, as SVG attributes require raw strings.
 */
export function LineChart({
  points,
  target = null,
  format,
  targetLabel,
}: {
  points: DayPoint[];
  target?: number | null;
  format: (value: number) => string;
  targetLabel?: string;
}) {
  const scaled = plot(points, target);
  if (!scaled) return null;

  const { plotted, y, min, max } = scaled;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div>
      <p className="text-fg-dim num mb-1 text-right text-[11px]">
        {format(min)}
        {min === max ? "" : ` \u2013 ${format(max)}`}
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${format(min)} to ${format(max)} over ${points.length} days`}
      >
        {target === null ? null : (
          <line
            x1={0}
            x2={WIDTH}
            y1={y(target)}
            y2={y(target)}
            stroke={tokens.borderStrong}
            strokeWidth={1}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        )}

        <polyline
          points={plotted.map((item) => `${item.x},${item.y}`).join(" ")}
          fill="none"
          stroke={tokens.fg}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {plotted.length <= DOT_LIMIT
          ? plotted.map((item) => (
              <circle
                key={item.point.date}
                cx={item.x}
                cy={item.y}
                r={2}
                fill={tokens.fg}
                vectorEffect="non-scaling-stroke"
              />
            ))
          : null}
      </svg>

      <div className="text-fg-dim num mt-1 flex justify-between text-[11px]">
        <span>{formatMonthDay(first.date)}</span>
        {target === null ? null : <span>{targetLabel ?? format(target)}</span>}
        <span>{formatMonthDay(last.date)}</span>
      </div>
    </div>
  );
}

/**
 * Sessions completed against the weekly target. Overshooting fills the ring and
 * stops; the number underneath still says how many.
 */
export function GoalRing({
  value,
  target,
  label,
}: {
  value: number;
  target: number;
  label: string;
}) {
  const size = 64;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-16 shrink-0"
        role="img"
        aria-label={`${value} of ${target} sessions`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tokens.surfaceOverlay}
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ratio >= 1 ? tokens.statusGreen : tokens.fg}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div>
        <p className="num text-xl leading-none">
          {value}
          <span className="text-fg-dim text-sm"> / {target}</span>
        </p>
        <p className="text-fg-dim mt-1 text-[11px]">{label}</p>
      </div>
    </div>
  );
}
